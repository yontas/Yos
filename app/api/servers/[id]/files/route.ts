import { NextRequest, NextResponse } from 'next/server';
import {
  archiveServerEntries,
  createServerEntry,
  deleteServerEntry,
  extractZipFile,
  listServerFiles,
  moveServerEntry,
  readServerFile,
  renameServerEntry,
  writeServerFile,
} from '@/lib/files';
import { emitFilesChanged } from '@/lib/events';
import { requireServerAccess } from '@/lib/guards';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const access = requireServerAccess(req, id);
  if (access.error) return access.error;

  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode') || 'list';
    const targetPath = searchParams.get('path') || '';

    if (mode === 'read') {
      const file = readServerFile(id, targetPath);
      return NextResponse.json({ path: targetPath, ...file });
    }

    const entries = listServerFiles(id, targetPath);
    return NextResponse.json({ path: targetPath, entries });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal membaca file.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const access = requireServerAccess(req, id);
  if (access.error) return access.error;

  try {
    const body = (await req.json()) as Record<string, unknown>;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Payload tidak valid.' }, { status: 400 });
    }

    const action = typeof body.action === 'string' ? body.action : '';
    const filePath = typeof body.path === 'string' ? body.path : '';
    const newPath = typeof body.newPath === 'string' ? body.newPath : '';
    const currentDir = typeof body.currentDir === 'string' ? body.currentDir : '';
    const targetDir = typeof body.targetDir === 'string' ? body.targetDir : '';
    const pathsList = Array.isArray(body.paths)
      ? body.paths.filter((item): item is string => typeof item === 'string')
      : [];

    if (action === 'write') {
      if (typeof body.path !== 'string' || (body.content !== undefined && typeof body.content !== 'string')) {
        return NextResponse.json({ error: 'Path dan konten file harus berupa teks.' }, { status: 400 });
      }
      writeServerFile(
        id,
        filePath,
        typeof body.content === 'string' ? body.content : '',
        body.encoding === 'base64' ? 'base64' : 'utf8'
      );
      emitFilesChanged(id);
      return NextResponse.json({ ok: true });
    }

    if (action === 'create') {
      createServerEntry(id, filePath, body.entryType === 'directory' ? 'directory' : 'file');
      emitFilesChanged(id);
      return NextResponse.json({ ok: true });
    }

    if (action === 'rename') {
      renameServerEntry(id, filePath, newPath);
      emitFilesChanged(id);
      return NextResponse.json({ ok: true });
    }

    if (action === 'extract') {
      extractZipFile(id, filePath);
      emitFilesChanged(id);
      return NextResponse.json({ ok: true });
    }

    if (action === 'move') {
      moveServerEntry(id, filePath, newPath);
      emitFilesChanged(id);
      return NextResponse.json({ ok: true });
    }

    if (action === 'archive') {
      const targetPaths = Array.isArray(body.paths)
        ? pathsList
        : filePath
        ? [filePath]
        : [];
      const archivePath = archiveServerEntries(id, targetPaths, currentDir);
      emitFilesChanged(id);
      return NextResponse.json({ ok: true, archivePath });
    }

    if (action === 'moveMany') {
      if (pathsList.length === 0) {
        return NextResponse.json({ error: 'Tidak ada item yang dipilih.' }, { status: 400 });
      }
      const cleanDir = targetDir.replace(/^\/+|\/+$/g, '');
      for (const itemPath of pathsList) {
        const baseName = itemPath.split('/').pop() || itemPath;
        const destPath = cleanDir ? `${cleanDir}/${baseName}` : baseName;
        moveServerEntry(id, itemPath, destPath);
      }
      emitFilesChanged(id);
      return NextResponse.json({ ok: true });
    }

    if (action === 'deleteMany') {
      if (pathsList.length === 0) {
        return NextResponse.json({ error: 'Tidak ada item yang dipilih.' }, { status: 400 });
      }
      for (const itemPath of pathsList) {
        deleteServerEntry(id, itemPath);
      }
      emitFilesChanged(id);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Aksi file tidak valid.' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal memproses file.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const access = requireServerAccess(req, id);
  if (access.error) return access.error;

  try {
    const { searchParams } = new URL(req.url);
    const targetPath = searchParams.get('path') || '';
    deleteServerEntry(id, targetPath);
    emitFilesChanged(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal menghapus target.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
