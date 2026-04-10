import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

declare global {
  // eslint-disable-next-line no-var
  var __ingestProcess: ReturnType<typeof spawn> | null;
  // eslint-disable-next-line no-var
  var __ingestStderr: string;
}

export async function POST() {
  if (global.__ingestProcess && !global.__ingestProcess.killed) {
    return NextResponse.json({ status: "already_running", message: "Veri aktarimi zaten calisiyor" });
  }

  const projectRoot = path.resolve(process.cwd());
  const pythonDir = path.join(projectRoot, "python");
  // Check local venv first, then parent venv
  const localVenv = path.join(projectRoot, "venv", "Scripts", "python.exe");
  const parentVenv = path.join(projectRoot, "..", "venv", "Scripts", "python.exe");
  const venvPython = fs.existsSync(localVenv) ? localVenv : parentVenv;
  const scriptPath = path.join(pythonDir, "ingest_cmapss.py");

  if (!fs.existsSync(venvPython)) {
    return NextResponse.json(
      { status: "error", message: `Python bulunamadi: ${venvPython}` },
      { status: 500 }
    );
  }
  if (!fs.existsSync(scriptPath)) {
    return NextResponse.json(
      { status: "error", message: `Script bulunamadi: ${scriptPath}` },
      { status: 500 }
    );
  }

  try {
    global.__ingestStderr = "";

    const proc = spawn(
      venvPython,
      ["ingest_cmapss.py", "--units", "5", "--samples", "50", "--delay", "0.05"],
      {
        cwd: pythonDir,
        stdio: ["ignore", "pipe", "pipe"],
        detached: false,
        shell: false,
      }
    );

    global.__ingestProcess = proc;

    proc.stderr?.on("data", (data: Buffer) => {
      global.__ingestStderr = (global.__ingestStderr || "").slice(-2000) + data.toString();
    });

    proc.on("error", (err) => {
      global.__ingestStderr += `\nSpawn error: ${err.message}`;
      global.__ingestProcess = null;
    });

    proc.on("exit", (code) => {
      if (code !== 0) {
        global.__ingestStderr += `\nProcess exited with code ${code}`;
      }
      global.__ingestProcess = null;
    });

    // Brief check for immediate crash
    const crashed = await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), 800);
      proc.on("exit", () => {
        clearTimeout(timer);
        resolve(true);
      });
    });

    if (crashed) {
      return NextResponse.json(
        {
          status: "error",
          message: `Veri aktarimi baslatilamadi. Hata: ${global.__ingestStderr.slice(-500)}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ status: "started", message: "NASA CMAPSS veri aktarimi baslatildi" });
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: `Spawn hatasi: ${err}` },
      { status: 500 }
    );
  }
}
