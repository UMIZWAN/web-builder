@php
    $blocks = $props['blocks'] ?? [
        ['content' => 'A SPACE FOR YOUR IDEAS', 'tag' => 'p', 'fontSize' => 11, 'weight' => '700', 'color' => '#748276', 'letterSpacing' => 2],
        ['content' => $props['title'] ?? '', 'tag' => 'h1', 'fontSize' => 64, 'weight' => '700', 'color' => '#242e2b', 'letterSpacing' => -2, 'lineHeight' => 1.1],
        ['content' => $props['text'] ?? '', 'tag' => 'p', 'fontSize' => 19, 'color' => '#6c7771', 'lineHeight' => 1.7],
    ];
    $layout = $props['layout'] ?? 'stacked';
    $mediaType = $props['mediaType'] ?? 'none';
    $mediaUrl = preg_replace('~^https?://(?:localhost|127\.0\.0\.1)(?::\d+)?(/storage/hero-media/)~i', '$1', $props['mediaUrl'] ?? '');
    $mediaEnabled = $props['mediaEnabled'] ?? ($mediaType !== 'none');
    $hasMedia = ($props['mediaEnabled'] ?? true) && in_array($mediaType, ['image', 'video'], true) && preg_match('~^(?:https?://|/(?!/))~i', $mediaUrl);
@endphp
<section class="hero-builder hero-builder--{{ $layout }}" style="background-color:{{ $props['backgroundColor'] ?? '#eef2e8' }};min-height:{{ $props['minHeight'] ?? 400 }}px;padding:{{ $props['paddingY'] ?? 100 }}px 24px;text-align:{{ $props['alignment'] ?? 'center' }};--hero-width:{{ $props['contentWidth'] ?? 1120 }}px;--hero-gap:{{ $props['gap'] ?? 24 }}px">
    @if($mediaEnabled && $layout === 'background')
        <div class="hero-builder-background hero-media-surface">
            @if(!$hasMedia)
                <div class="hero-media-placeholder" role="img" aria-label="Media placeholder"></div>
            @elseif($mediaType === 'video')
                <video onerror="this.style.visibility='hidden'" src="{{ $mediaUrl }}" autoplay muted loop playsinline style="object-fit:{{ $props['mediaFit'] ?? 'cover' }}"></video>
            @else
                <img onerror="this.style.visibility='hidden'" src="{{ $mediaUrl }}" alt="" style="object-fit:{{ $props['mediaFit'] ?? 'cover' }}">
            @endif
            @if($hasMedia)<div style="background-color:#000;opacity:{{ ($props['overlay'] ?? 35) / 100 }}"></div>@endif
        </div>
    @endif
    <div class="hero-builder-inner">
        <div class="hero-builder-text">
            @foreach($blocks as $block)
                @php($tag = in_array($block['tag'] ?? 'p', ['h1', 'h2', 'h3', 'p'], true) ? ($block['tag'] ?? 'p') : 'p')
                <{{ $tag }} style="font-size:min({{ $block['fontSize'] ?? 20 }}px, {{ $tag === 'p' ? 7 : 12 }}vw);font-weight:{{ $block['weight'] ?? '400' }};color:{{ $block['color'] ?? '#242e2b' }};font-style:{{ $block['italic'] ?? 'normal' }};letter-spacing:{{ $block['letterSpacing'] ?? 0 }}px;line-height:{{ $block['lineHeight'] ?? 1.5 }}">{{ $block['content'] ?? '' }}</{{ $tag }}>
            @endforeach
        </div>
        @if($mediaEnabled && $layout !== 'background')
            <div class="hero-builder-media"><div class="hero-media-surface" style="height:{{ $props['mediaHeight'] ?? 360 }}px">
                @if(!$hasMedia)
                    <div class="hero-media-placeholder" role="img" aria-label="Media placeholder"></div>
                @elseif($mediaType === 'video')
                    <video @if(($props['mediaFit'] ?? 'cover') === 'contain') onloadedmetadata="this.parentElement.style.width='min(100%, '+({{ $props['mediaHeight'] ?? 360 }}*this.videoWidth/this.videoHeight)+'px)';this.parentElement.style.height='auto';this.parentElement.classList.add('hero-media-surface--asset')" @endif onerror="this.style.visibility='hidden'" src="{{ $mediaUrl }}" controls playsinline style="height:{{ $props['mediaHeight'] ?? 360 }}px;object-fit:{{ $props['mediaFit'] ?? 'cover' }}"></video>
                @else
                    <img @if(($props['mediaFit'] ?? 'cover') === 'contain') onload="this.parentElement.style.width='min(100%, '+({{ $props['mediaHeight'] ?? 360 }}*this.naturalWidth/this.naturalHeight)+'px)';this.parentElement.style.height='auto';this.parentElement.classList.add('hero-media-surface--asset')" @endif onerror="this.style.visibility='hidden'" src="{{ $mediaUrl }}" alt="{{ $props['mediaAlt'] ?? '' }}" style="height:{{ $props['mediaHeight'] ?? 360 }}px;object-fit:{{ $props['mediaFit'] ?? 'cover' }}">
                @endif
            </div></div>
        @endif
    </div>
</section>
