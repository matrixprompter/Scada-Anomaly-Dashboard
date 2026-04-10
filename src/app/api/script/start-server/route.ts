import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

declare global {
  // eslint-disable-next-line no-var
  var __mlServerProcess: ReturnType<typeof spawn> | null;
  // eslint-disable-next-line no-var
  var __mlServerStderr: string;
}

export async function POST() {
  if (global.__mlServerProcess && !global.__mlServerProcess.killed) {
    return NextResponse.json({ status: "already_running", message: "ML API zaten calisiyor" });
  }

  const projectRoot = path.resolve(process.cwd());
  const pythonDir = path.join(projectRoot, "python");
  // Check local venv first, then parent venv
  const localVenv = path.join(projectRoot, "venv", "Scripts", "python.exe");
  const parentVenv = path.join(projectRoot, "..", "venv", "Scripts", "python.exe");
  const venvPython = fs.existsSync(localVenv) ? localVenv : parentVenv;

  // Validate paths exist
  if (!fs.existsSync(venvPython)) {
    return NextResponse.json(
      { status: "error", message: `Python bulunamadi: ${venvPython}` },
      { status: 500 }
    );
  }
  if (!fs.existsSync(pythonDir)) {
    return NextResponse.json(
      { status: "error", message: `Python dizini bulunamadi: ${pythonDir}` },
      { status: 500 }
    );
  }

  try {
    global.__mlServerStderr = "";

    const proc = spawn(
      venvPython,
      ["-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"],
      {
        cwd: pythonDir,
        stdio: ["ignore", "pipe", "pipe"],
        detached: false,
        shell: false,
      }
    );

    global.__mlServerProcess = proc;

    // Capture stderr for debugging
    proc.stderr?.on("data", (data: Buffer) => {
      global.__mlServerStderr = (global.__mlServerStderr || "").slice(-2000) + data.toString();
    });

    proc.on("error", (err) => {
      global.__mlServerStderr += `\nSpawn error: ${err.message}`;
      global.__mlServerProcess = null;
    });

    proc.on("exit", (code) => {
      if (code !== 0) {
        global.__mlServerStderr += `\nProcess exited with code ${code}`;
      }
      global.__mlServerProcess = null;
    });

    // Wait briefly to catch immediate crashes (like missing module)
    const crashed = await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), 1500);
      proc.on("exit", () => {
        clearTimeout(timer);
        resolve(true);
      });
    });

    if (crashed) {
      return NextResponse.json(
        {
          status: "error",
          message: `ML API baslatilamadi. Hata: ${global.__mlServerStderr.slice(-500)}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: "started",
      message: "ML API port 8000 uzerinde baslatildi",
    });
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: `Spawn hatasi: ${err}` },
      { status: 500 }
    );
  }
}
