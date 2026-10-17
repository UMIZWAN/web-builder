<?php

namespace Tests\Feature;

use App\Models\Page;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class PageBuilderTest extends TestCase
{
    use DatabaseTransactions;

    public function test_admin_routes_require_authentication(): void
    {
        $this->get(route('pages.index'))->assertRedirect(route('login'));
        $this->post(route('pages.store'), ['title' => 'Private', 'slug' => 'private'])->assertRedirect(route('login'));
    }

    public function test_drafts_stay_private_and_published_content_survives_draft_edits(): void
    {
        $page = Page::factory()->create();
        $user = User::factory()->create();
        $this->get(route('page.show', $page->slug))->assertNotFound();
        $published = ['root' => ['props' => []], 'content' => [['type' => 'Text', 'props' => ['id' => 'text-1', 'title' => 'Published heading', 'text' => 'Published body']]]];
        $this->actingAs($user)->putJson(route('pages.update', $page), ['content' => $published, 'publish' => true])->assertOk();
        $draft = $published;
        $draft['content'][0]['props']['title'] = 'Private draft heading';
        $this->putJson(route('pages.update', $page), ['content' => $draft, 'publish' => false])->assertOk();
        $this->get(route('page.show', $page->slug))->assertOk()->assertSee('Published heading')->assertDontSee('Private draft heading');
        $this->get(route('pages.preview', $page))->assertOk()->assertSee('Private draft heading');
        $this->post(route('pages.unpublish', $page))->assertRedirect();
        $this->get(route('page.show', $page->slug))->assertNotFound();
    }

    public function test_unsafe_links_and_unknown_components_are_rejected(): void
    {
        $this->actingAs(User::factory()->create());
        $page = Page::factory()->create();
        $content = ['root' => ['props' => []], 'content' => [['type' => 'Button', 'props' => ['id' => 'button-1', 'label' => 'Click', 'href' => 'javascript:alert(1)']]]];
        $this->putJson(route('pages.update', $page), ['content' => $content, 'publish' => true])->assertUnprocessable();
        $content['content'][0]['type'] = 'RawHTML';
        $this->putJson(route('pages.update', $page), ['content' => $content, 'publish' => true])->assertUnprocessable();
    }

    public function test_pages_can_be_created_and_admin_slugs_are_reserved(): void
    {
        $this->actingAs(User::factory()->create());
        $this->post(route('pages.store'), ['title' => 'Test page', 'slug' => 'test-'.fake()->uuid()])->assertRedirect();
        $this->postJson(route('pages.store'), ['title' => 'Login', 'slug' => 'login'])->assertUnprocessable();
    }

    public function test_flexible_hero_settings_are_saved_and_rendered(): void
    {
        $this->actingAs(User::factory()->create());
        $page = Page::factory()->create();
        $props = [
            'id' => 'hero-1', 'backgroundColor' => '#123456', 'layout' => 'media-left',
            'alignment' => 'left', 'minHeight' => 600, 'paddingY' => 80, 'contentWidth' => 1000, 'gap' => 16,
            'mediaType' => 'image', 'mediaUrl' => 'https://example.com/hero.jpg', 'mediaAlt' => 'Mountain view',
            'mediaHeight' => 400, 'mediaFit' => 'contain', 'overlay' => 40,
            'blocks' => [
                ['content' => 'Custom eyebrow', 'tag' => 'p', 'fontSize' => 14, 'color' => '#ffffff'],
                ['content' => 'Custom heading', 'tag' => 'h1', 'fontSize' => 72, 'weight' => '800', 'italic' => 'italic', 'letterSpacing' => -1, 'lineHeight' => 1.2],
                ['content' => '<script>alert(1)</script>', 'tag' => 'p'],
            ],
        ];
        $content = ['root' => ['props' => []], 'content' => [['type' => 'Hero', 'props' => $props]]];
        $this->putJson(route('pages.update', $page), ['content' => $content, 'publish' => true])->assertOk();
        $this->assertEquals($content, $page->fresh()->published_content);
        $this->get(route('page.show', $page->slug))->assertOk()
            ->assertSee('Custom eyebrow')->assertSee('Custom heading')->assertSee('Mountain view')
            ->assertSee('hero-builder--media-left')->assertSee('background-color:#123456', false)
            ->assertSee('<script>alert(1)</script>')->assertDontSee('<script>alert(1)</script>', false);
        $content['content'][0]['props']['blocks'] = [];
        $content['content'][0]['props']['layout'] = 'background';
        $content['content'][0]['props']['mediaType'] = 'video';
        $content['content'][0]['props']['mediaUrl'] = '/storage/hero.mp4';
        $this->putJson(route('pages.update', $page), ['content' => $content, 'publish' => true])->assertOk();
        $this->get(route('page.show', $page->slug))->assertOk()->assertSee('autoplay muted loop playsinline', false)->assertDontSee('Custom heading')->assertDontSee('A SPACE FOR YOUR IDEAS');
    }

    public function test_hero_rejects_unsafe_media_and_invalid_styles(): void
    {
        $this->actingAs(User::factory()->create());
        $page = Page::factory()->create();
        $content = ['root' => ['props' => []], 'content' => [['type' => 'Hero', 'props' => [
            'id' => 'hero-1', 'mediaUrl' => 'javascript:alert(1)', 'backgroundColor' => 'red;display:none',
            'blocks' => [['content' => 'Hello', 'tag' => 'script', 'fontSize' => 999]],
        ]]]];
        $this->putJson(route('pages.update', $page), ['content' => $content, 'publish' => true])
            ->assertUnprocessable()->assertJsonValidationErrors([
                'content.content.0.props.mediaUrl', 'content.content.0.props.backgroundColor',
                'content.content.0.props.blocks.0.tag', 'content.content.0.props.blocks.0.fontSize',
            ]);
    }

    public function test_legacy_hero_still_renders_all_three_texts(): void
    {
        $page = Page::factory()->create([
            'published_at' => now(),
            'published_content' => ['root' => ['props' => []], 'content' => [['type' => 'Hero', 'props' => ['id' => 'old-hero', 'title' => 'Original title', 'text' => 'Original description']]]],
        ]);
        $this->get(route('page.show', $page->slug))->assertOk()->assertSee('A SPACE FOR YOUR IDEAS')->assertSee('Original title')->assertSee('Original description');
    }

    public function test_existing_uploaded_hero_media_uses_the_current_site_origin(): void
    {
        $page = Page::factory()->create([
            'published_at' => now(),
            'published_content' => ['root' => ['props' => []], 'content' => [['type' => 'Hero', 'props' => [
                'id' => 'hero-upload', 'mediaType' => 'image',
                'mediaUrl' => 'http://localhost:8000/storage/hero-media/example.jpg',
            ]]]],
        ]);
        $this->get(route('page.show', $page->slug))->assertOk()
            ->assertSee('src="/storage/hero-media/example.jpg"', false)
            ->assertDontSee('http://localhost:8000/storage/hero-media/example.jpg', false);
    }

    public function test_hero_media_can_be_hidden_without_losing_the_selected_file(): void
    {
        $this->actingAs(User::factory()->create());
        $page = Page::factory()->create();
        $content = ['root' => ['props' => []], 'content' => [['type' => 'Hero', 'props' => [
            'id' => 'hero-toggle', 'mediaType' => 'image', 'mediaUrl' => '/storage/hero-media/example.jpg', 'mediaEnabled' => false,
        ]]]];
        $this->putJson(route('pages.update', $page), ['content' => $content, 'publish' => true])->assertOk();
        $this->get(route('page.show', $page->slug))->assertOk()->assertDontSee('src="/storage/hero-media/example.jpg"', false);
        $this->assertSame('/storage/hero-media/example.jpg', $page->fresh()->published_content['content'][0]['props']['mediaUrl']);
        $content['content'][0]['props']['mediaEnabled'] = true;
        $this->putJson(route('pages.update', $page), ['content' => $content, 'publish' => true])->assertOk();
        $this->get(route('page.show', $page->slug))->assertOk()->assertSee('src="/storage/hero-media/example.jpg"', false);
    }

    public function test_enabled_hero_without_a_file_renders_a_grey_placeholder(): void
    {
        $page = Page::factory()->create([
            'published_at' => now(),
            'published_content' => ['root' => ['props' => []], 'content' => [['type' => 'Hero', 'props' => [
                'id' => 'empty-media', 'mediaEnabled' => true, 'mediaType' => 'none', 'mediaUrl' => '', 'layout' => 'media-right',
            ]]]],
        ]);
        $this->get(route('page.show', $page->slug))->assertOk()
            ->assertSee('class="hero-media-placeholder"', false)->assertDontSee('<img', false)->assertDontSee('<video', false);
    }
}
