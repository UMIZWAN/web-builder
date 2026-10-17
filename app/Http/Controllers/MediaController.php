<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class MediaController extends Controller
{
    public function index(): JsonResponse
    {
        $disk = Storage::disk('public');
        $files = collect($disk->files('hero-media'))->filter(fn (string $path): bool => in_array(strtolower(pathinfo($path, PATHINFO_EXTENSION)), ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'mp4', 'webm'], true));

        return response()->json(['files' => $files->map(fn (string $path): array => [
            'name' => basename($path),
            'displayName' => $disk->exists($path.'.json') ? (json_decode($disk->get($path.'.json'), true)['name'] ?? basename($path)) : basename($path),
            'url' => '/storage/'.$path,
            'type' => in_array(strtolower(pathinfo($path, PATHINFO_EXTENSION)), ['mp4', 'webm'], true) ? 'video' : 'image',
            'size' => $disk->size($path),
            'modified' => $disk->lastModified($path),
        ])->sortByDesc('modified')->values()]);
    }

    public function destroy(string $filename): JsonResponse
    {
        abort_unless(preg_match('/^[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp|gif|avif|mp4|webm)$/i', $filename), 404);
        $disk = Storage::disk('public');
        $path = 'hero-media/'.$filename;
        abort_unless($disk->exists($path), 404);
        abort_unless($disk->delete($path), 500, 'Could not delete the file.');

        $disk->delete($path.'.json');

        return response()->json(['message' => 'Media deleted.']);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'media' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,gif,avif,mp4,webm', 'max:51200'],
        ]);
        $file = $request->file('media');
        $path = $file->store('hero-media', 'public');
        abort_unless($path, 500, 'Could not store the media. Please try again.');

        Storage::disk('public')->put($path.'.json', json_encode(['name' => $file->getClientOriginalName()]));

        return response()->json([
            'url' => '/storage/'.$path,
            'type' => str_starts_with($file->getMimeType(), 'video/') ? 'video' : 'image',
        ], 201);
    }
}
