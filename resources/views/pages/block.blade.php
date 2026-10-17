@switch($type)
@case('Hero')@include('pages.hero', ['props' => $props])@break
@case('Text')<section class="site-section"><h2>{{ $props['title'] ?? '' }}</h2><p class="preserve-lines">{{ $props['text'] ?? '' }}</p></section>@break
@case('Features')<section class="site-section"><h2>{{ $props['title'] ?? '' }}</h2><div class="feature-grid">@foreach(($props['items'] ?? []) as $item)<article class="feature-card"><span>✦</span><h3>{{ $item['title'] ?? '' }}</h3><p>{{ $item['text'] ?? '' }}</p></article>@endforeach</div></section>@break
@case('Button')<section class="site-section"><a class="primary" href="{{ $props['href'] ?? '#' }}">{{ $props['label'] ?? 'Learn more' }}</a></section>@break
@endswitch