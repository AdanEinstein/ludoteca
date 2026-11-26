#!/usr/bin/env python3
"""Update the Ludoteca Tizen app on the Samsung TV (see ../SKILL.md).

Steps: find the TV on the LAN -> check dev mode -> package a COPY of tizen/ outside the repo -> sdb connect -> install -> relaunch -> verify.
Python standard library only. `--dry-run` never connects, installs or launches anything: it only reads the TV's public info endpoint
and builds the package in a temp folder.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import json
import os
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

APP_ID = "LudotecaTV.Ludoteca"
ROOT = Path(__file__).resolve().parents[4]  # repo root: <root>/.claude/skills/ludoteca-tv-deploy/scripts/deploy_tv.py
STUDIO = Path(os.environ.get("TIZEN_STUDIO", Path.home() / "tizen-studio"))
SDB = STUDIO / "tools" / "sdb"
TIZEN = STUDIO / "tools" / "ide" / "bin" / "tizen"


def say(message: str) -> None:
    print(message, flush=True)


def fail(message: str, hint: str = "") -> "None":
    say(f"ERRO: {message}")
    if hint:
        say(f"  -> {hint}")
    sys.exit(1)


def run(args: list[str | Path], timeout: int = 120, cwd: Path | None = None) -> subprocess.CompletedProcess[str]:
    env = {**os.environ, "PATH": f"{STUDIO / 'tools'}:{STUDIO / 'tools' / 'ide' / 'bin'}:{os.environ['PATH']}"}
    return subprocess.run([str(a) for a in args], capture_output=True, text=True, timeout=timeout, cwd=cwd, env=env)


def pc_ip() -> str:
    """The IP this PC uses on the LAN (the TV app points to it, see tizen/index.html)."""
    out = run(["ip", "-4", "route", "get", "1.1.1.1"]).stdout
    match = re.search(r"src (\d+\.\d+\.\d+\.\d+)", out)
    if match:
        return match.group(1)
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:  # no packet is sent by connect() on UDP
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]


def tv_info(ip: str, timeout: float = 2.0) -> dict | None:
    """Samsung's open info endpoint. None if it is not a Samsung TV."""
    try:
        with urllib.request.urlopen(f"http://{ip}:8001/api/v2/", timeout=timeout) as r:
            data = json.load(r)
        return data if isinstance(data.get("device"), dict) else None
    except (urllib.error.URLError, OSError, ValueError, TimeoutError):
        return None


def discover(model: str, pc: str) -> tuple[str, dict]:
    """Scans the PC's /24 for hosts answering on 8001 like a Samsung TV (the TV's IP changes by DHCP)."""
    prefix = pc.rsplit(".", 1)[0]

    def probe(i: int) -> tuple[str, dict] | None:
        ip = f"{prefix}.{i}"
        with socket.socket() as s:
            s.settimeout(0.6)
            if s.connect_ex((ip, 8001)) != 0:
                return None
        info = tv_info(ip)
        return (ip, info) if info else None

    with concurrent.futures.ThreadPoolExecutor(64) as pool:
        found = [r for r in pool.map(probe, range(1, 255)) if r]
    if not found:
        fail(f"nenhuma TV Samsung respondeu na porta 8001 em {prefix}.0/24",
             "a TV está ligada (não em standby) e na mesma rede? Passe o IP com --ip.")
    exact = [f for f in found if str(f[1]["device"].get("modelName", "")).startswith(model)]
    chosen = exact or found
    if len(chosen) > 1:
        names = ", ".join(f"{ip} ({i['device'].get('modelName')})" for ip, i in chosen)
        fail(f"mais de uma TV encontrada: {names}", "escolha uma com --ip.")
    return chosen[0]


def check_server(pc: str, port: int) -> None:
    """The shell (tizen/index.html) waits for http://<SERVER>/ ; warn if it is not the PC's IP or is not answering."""
    html = (ROOT / "tizen" / "index.html").read_text(encoding="utf-8")
    match = re.search(r"var SERVER = '([^']+)'", html)
    configured = match.group(1) if match else "?"
    if f"//{pc}:" not in configured:
        say(f"AVISO: tizen/index.html aponta para {configured}, mas este PC está em {pc}. "
            "Edite SERVER (ou fixe o IP do PC em 192.168.1.10) e reinstale.")
    try:
        urllib.request.urlopen(f"http://{pc}:{port}/", timeout=3).read(1)
        say(f"servidor da Ludoteca respondendo em http://{pc}:{port}/")
    except (urllib.error.URLError, OSError):
        say(f"AVISO: o servidor não responde em http://{pc}:{port}/ . Suba com `pnpm start` antes de relançar o app.")


def package(profile: str) -> Path:
    """Signs a COPY of tizen/ (tizen package writes signature files into the folder it runs in). Returns the .wgt path."""
    listed = run([TIZEN, "security-profiles", "list"]).stdout
    if not re.search(rf"^{re.escape(profile)}\s", listed, re.M):
        fail(f"perfil de certificado '{profile}' não existe", "crie no Certificate Manager (~/tizen-studio/tools/certificate-manager/certificate-manager), com o login Samsung do usuário.")
    work = Path(tempfile.mkdtemp(prefix="ludoteca-tizen-"))
    build, out = work / "build", work / "out"
    shutil.copytree(ROOT / "tizen", build, ignore=shutil.ignore_patterns("README.md"))
    out.mkdir()
    result = run([TIZEN, "package", "-t", "wgt", "-s", profile, "-o", out, "--", build], cwd=build)
    wgt = out / "Ludoteca.wgt"
    if result.returncode != 0 or not wgt.exists():
        fail("o empacotamento falhou", (result.stdout + result.stderr).strip()[-600:])
    say(f"pacote assinado: {wgt} ({wgt.stat().st_size // 1024} KB)")
    return wgt


def connect(ip: str) -> str:
    out = run([SDB, "connect", ip], timeout=20).stdout
    serial = f"{ip}:26101"
    devices = run([SDB, "devices"]).stdout
    if not re.search(rf"{re.escape(serial)}\s+device", devices):
        fail(f"sdb não conectou a {serial}: {out.strip()}",
             "porta 26101 recusada = modo desenvolvedor ligado mas a TV não foi reiniciada por completo (tire da tomada ~15 s). Veja references/troubleshooting.md.")
    say(f"sdb conectado: {serial}")
    return serial


def install(wgt: Path, serial: str) -> None:
    result = run([TIZEN, "install", "-n", wgt.name, "-s", serial, "--", wgt.parent], timeout=180)
    text = result.stdout + result.stderr
    if "successfully installed" not in text:
        fail("a instalação falhou", text.strip()[-800:])
    say("app instalado")


def api(ip: str, method: str, timeout: float = 5.0) -> str:
    request = urllib.request.Request(f"http://{ip}:8001/api/v2/applications/{APP_ID}", method=method)
    with urllib.request.urlopen(request, timeout=timeout) as r:
        return r.read().decode()


def relaunch(ip: str, serial: str | None) -> None:
    """Samsung's own API (the same one the Ludoteca server will use later); falls back to `tizen run` through sdb."""
    try:
        for method in ("DELETE", "POST"):
            api(ip, method)
            time.sleep(2)
        say("app reiniciado pela API da Samsung")
    except (urllib.error.URLError, OSError) as error:
        if not serial:
            fail(f"a API da Samsung não respondeu ({error})")
        result = run([TIZEN, "run", "-p", APP_ID, "-s", serial], timeout=60)
        if "successfully launched" not in result.stdout + result.stderr:
            fail("não consegui abrir o app", (result.stdout + result.stderr).strip()[-500:])
        say("app aberto por `tizen run`")


def verify(ip: str, pc: str, port: int) -> None:
    """The app is running, and (best effort) the TV registered a room on the Ludoteca server, i.e. the page really loaded."""
    time.sleep(6)
    try:
        state = json.loads(api(ip, "GET"))
        say(f"app na TV: running={state.get('running')} visible={state.get('visible')}")
    except (urllib.error.URLError, OSError, ValueError):
        say("AVISO: não consegui ler o estado do app pela API.")
    if shutil.which("node"):
        script = ("const ws=new WebSocket('ws://127.0.0.1:%d/ws?browse');"
                  "ws.onmessage=e=>{console.log(e.data);ws.close()};ws.onerror=()=>console.log('erro');setTimeout(()=>process.exit(0),3000)" % port)
        out = run(["node", "-e", script], timeout=10).stdout.strip()
        say(f"TVs registradas no servidor: {out}  (a da TV real é a que mostra o QR; outras podem ser abas de navegador)")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--ip", default=os.environ.get("TV_IP"), help="IP da TV (padrão: descobrir na rede)")
    p.add_argument("--model", default="UN65DU7700GXZD", help="prefixo do modelo, para escolher entre várias TVs")
    p.add_argument("--profile", default="ludoteca", help="perfil de certificado do Tizen")
    p.add_argument("--port", type=int, default=3000, help="porta do servidor da Ludoteca")
    p.add_argument("--dry-run", action="store_true", help="só descobre, confere e empacota; NÃO conecta, instala nem abre nada na TV")
    p.add_argument("--relaunch-only", action="store_true", help="só reinicia o app (conteúdo novo do servidor); não empacota nem instala")
    args = p.parse_args()

    for tool in (SDB, TIZEN):
        if not tool.exists():
            fail(f"{tool} não existe", "instale o Tizen Studio CLI (TV Extensions) ou defina TIZEN_STUDIO.")

    pc = pc_ip()
    if args.ip:
        info = tv_info(args.ip)
        if not info:
            fail(f"{args.ip} não respondeu como TV Samsung na porta 8001")
        ip = args.ip
    else:
        ip, info = discover(args.model, pc)
    device = info["device"]
    say(f"TV: {ip}  modelo {device.get('modelName')}  PC: {pc}")
    check_server(pc, args.port)

    if args.relaunch_only:
        if args.dry_run:
            say("dry-run: relançaria o app pela API da Samsung. Nada foi feito.")
            return
        relaunch(ip, None)
        verify(ip, pc, args.port)
        return

    if device.get("developerMode") != "1":
        fail("modo desenvolvedor desligado na TV",
             "Apps > 1 2 3 4 5 no controle > Developer mode On > Host PC IP = " + pc + " > reiniciar a TV por completo.")
    if device.get("developerIP") not in (pc, "0.0.0.0", None):
        say(f"AVISO: o Host PC IP da TV é {device.get('developerIP')}, este PC é {pc}. O sdb pode recusar; ajuste na janela Developer mode.")

    wgt = package(args.profile)
    if args.dry_run:
        say("dry-run: nada foi conectado, instalado nem aberto na TV. Rode sem --dry-run para aplicar.")
        return

    serial = connect(ip)
    install(wgt, serial)
    relaunch(ip, serial)
    verify(ip, pc, args.port)
    say("pronto.")


if __name__ == "__main__":
    main()
