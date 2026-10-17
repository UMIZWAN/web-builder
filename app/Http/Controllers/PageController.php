<?php

namespace App\Http\Controllers;

use App\Models\Page;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\View\View;

class PageController extends Controller
{
    public function index(): View
    {
        return view('pages.index', ['pages' => Page::orderBy('position')->orderBy('id')->get()]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate(['title' => 'required|string|max:255', 'slug' => ['required', 'string', 'max:160', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::notIn(['admin', 'login', 'logout']), 'unique:pages,slug']]);
        $page = Page::create([...$data, 'position' => (Page::max('position') ?? 0) + 1, 'draft_content' => ['content' => [], 'root' => ['props' => []]]]);

        return redirect()->route('pages.edit', $page);
    }

    public function edit(Page $page): View
    {
        return view('pages.edit', compact('page'));
    }

    public function update(Request $request, Page $page): JsonResponse
    {
        $data = $request->validate([
            'content' => 'required|array', 'content.root' => 'required|array', 'content.content' => 'present|array|max:100',
            'content.content.*.type' => ['required', Rule::in(['Hero', 'Text', 'Features', 'Button'])],
            'content.content.*.props' => 'required|array', 'content.content.*.props.id' => 'required|string|max:255',
            'content.content.*.props.title' => 'sometimes|string|max:500',
            'content.content.*.props.text' => 'sometimes|string|max:20000',
            'content.content.*.props.label' => 'sometimes|string|max:200',
            'content.content.*.props.href' => ['sometimes', 'string', 'max:2000', 'regex:~^(?:/(?!/)|https?://|mailto:|tel:|#)~i'],
            'content.content.*.props.items' => 'sometimes|array|max:12',
            'content.content.*.props.items.*.title' => 'required|string|max:500',
            'content.content.*.props.items.*.text' => 'required|string|max:5000',
            'content.content.*.props.blocks' => 'sometimes|array|max:30',
            'content.content.*.props.blocks.*.content' => 'nullable|string|max:20000',
            'content.content.*.props.blocks.*.tag' => 'sometimes|in:h1,h2,h3,p',
            'content.content.*.props.blocks.*.fontSize' => 'sometimes|numeric|between:8,120',
            'content.content.*.props.blocks.*.weight' => 'sometimes|in:400,500,600,700,800',
            'content.content.*.props.blocks.*.color' => 'sometimes|regex:/^#[0-9a-fA-F]{6}$/',
            'content.content.*.props.blocks.*.italic' => 'sometimes|in:normal,italic',
            'content.content.*.props.blocks.*.letterSpacing' => 'sometimes|numeric|between:-5,20',
            'content.content.*.props.blocks.*.lineHeight' => 'sometimes|numeric|between:1,3',
            'content.content.*.props.backgroundColor' => 'sometimes|regex:/^#[0-9a-fA-F]{6}$/',
            'content.content.*.props.layout' => 'sometimes|in:stacked,media-left,media-right,background',
            'content.content.*.props.alignment' => 'sometimes|in:left,center,right',
            'content.content.*.props.minHeight' => 'sometimes|numeric|between:0,1200',
            'content.content.*.props.paddingY' => 'sometimes|numeric|between:0,240',
            'content.content.*.props.contentWidth' => 'sometimes|numeric|between:280,1600',
            'content.content.*.props.gap' => 'sometimes|numeric|between:0,100',
            'content.content.*.props.mediaEnabled' => 'sometimes|boolean',
            'content.content.*.props.mediaType' => 'sometimes|in:none,image,video',
            'content.content.*.props.mediaAlt' => 'nullable|string|max:500',
            'content.content.*.props.mediaHeight' => 'sometimes|numeric|between:100,1000',
            'content.content.*.props.mediaFit' => 'sometimes|in:cover,contain',
            'content.content.*.props.overlay' => 'sometimes|numeric|between:0,100',
            'content.content.*.props.mediaUrl' => ['nullable', 'string', 'max:2000', 'regex:~^(?:/(?!/)|https?://)~i'],
            'publish' => 'required|boolean',
        ]);
        $page->draft_content = $data['content'];
        if ($data['publish']) {
            $page->published_content = $data['content'];
            $page->published_at = now();
        }
        $page->save();

        return response()->json(['message' => $data['publish'] ? 'Page published.' : 'Draft saved.']);
    }

    public function unpublish(Page $page): RedirectResponse
    {
        $page->update(['published_content' => null, 'published_at' => null]);

        return back()->with('status', 'Page unpublished.');
    }

    public function move(Request $request, Page $page): RedirectResponse
    {
        $data = $request->validate(['direction' => ['required', Rule::in(['up', 'down'])]]);
        $pages = Page::orderBy('position')->orderBy('id')->get();
        $index = $pages->search(fn (Page $item): bool => $item->id === $page->id);
        $target = $index + ($data['direction'] === 'up' ? -1 : 1);
        if ($target >= 0 && $target < $pages->count()) {
            $other = $pages[$target];
            $pages[$target] = $page;
            $pages[$index] = $other;
            DB::transaction(function () use ($pages): void {
                foreach ($pages as $position => $item) {
                    $item->update(['position' => $position]);
                }
            });
        }

        return back();
    }

    public function destroy(Page $page): RedirectResponse
    {
        $page->delete();

        return redirect()->route('pages.index')->with('status', 'Page deleted.');
    }

    public function preview(Page $page): View
    {
        return $this->renderPage($page, true);
    }

    public function show(string $slug = 'home'): View
    {
        return $this->renderPage(Page::where('slug', $slug)->whereNotNull('published_at')->firstOrFail(), false);
    }

    private function renderPage(Page $page, bool $preview): View
    {
        return view('pages.public', ['page' => $page, 'preview' => $preview, 'content' => $preview ? $page->draft_content : $page->published_content, 'navigation' => Page::whereNotNull('published_at')->orderBy('position')->orderBy('id')->get()]);
    }
}
