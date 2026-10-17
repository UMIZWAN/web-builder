<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MediaUploadTest extends TestCase
{
    use DatabaseTransactions;

    public function test_media_upload_requires_authentication(): void
    {
        $this->postJson(route('media.store'))->assertUnauthorized();
    }

    public function test_an_image_is_stored_on_the_public_disk(): void
    {
        Storage::fake('public');
        $file = UploadedFile::fake()->image('hero.jpg');
        $response = $this->actingAs(User::factory()->create())->postJson(route('media.store'), ['media' => $file]);
        $response->assertCreated()->assertJsonPath('type', 'image');
        Storage::disk('public')->assertExists('hero-media/'.$file->hashName());
        $this->assertSame('/storage/hero-media/'.$file->hashName(), $response->json('url'));
        $this->getJson(route('media.index'))->assertOk()->assertJsonFragment(['displayName' => 'hero.jpg']);
    }

    public function test_video_can_be_imported(): void
    {
        Storage::fake('public');
        $file = UploadedFile::fake()->create('hero.mp4', 100, 'video/mp4');
        $this->actingAs(User::factory()->create())->postJson(route('media.store'), ['media' => $file])
            ->assertCreated()->assertJsonPath('type', 'video');
        Storage::disk('public')->assertExists('hero-media/'.$file->hashName());
    }

    public function test_unsupported_and_oversized_files_are_rejected(): void
    {
        Storage::fake('public');
        $this->actingAs(User::factory()->create());
        foreach ([UploadedFile::fake()->create('script.svg', 1, 'image/svg+xml'), UploadedFile::fake()->create('large.mp4', 51201, 'video/mp4')] as $file) {
            $this->postJson(route('media.store'), ['media' => $file])->assertUnprocessable()->assertJsonValidationErrors('media');
        }
        $this->assertEmpty(Storage::disk('public')->allFiles());
    }

    public function test_storage_lists_uploaded_media_and_deletes_only_the_requested_file(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('hero-media/example.jpg', 'image');
        Storage::disk('public')->put('hero-media/example.jpg.json', json_encode(['name' => 'Mountain sunrise.jpg']));
        Storage::disk('public')->put('hero-media/movie.webm', 'video');
        Storage::disk('public')->put('private.txt', 'keep');
        $this->actingAs(User::factory()->create());
        $this->getJson(route('media.index'))->assertOk()->assertJsonCount(2, 'files')
            ->assertJsonFragment(['displayName' => 'Mountain sunrise.jpg'])
            ->assertJsonFragment(['name' => 'example.jpg', 'url' => '/storage/hero-media/example.jpg', 'type' => 'image']);
        $this->deleteJson(route('media.destroy', ['filename' => 'example.jpg']))->assertOk();
        Storage::disk('public')->assertMissing('hero-media/example.jpg');
        Storage::disk('public')->assertMissing('hero-media/example.jpg.json');
        Storage::disk('public')->assertExists('hero-media/movie.webm');
        Storage::disk('public')->assertExists('private.txt');
        $this->deleteJson(route('media.destroy', ['filename' => 'missing.jpg']))->assertNotFound();
        $this->deleteJson(route('media.destroy', ['filename' => 'private.txt']))->assertNotFound();
    }

    public function test_storage_listing_and_deletion_require_authentication(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('hero-media/example.jpg', 'image');
        $this->getJson(route('media.index'))->assertUnauthorized();
        $this->deleteJson(route('media.destroy', ['filename' => 'example.jpg']))->assertUnauthorized();
        Storage::disk('public')->assertExists('hero-media/example.jpg');
    }
}
