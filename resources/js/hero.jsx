import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import assetPickerStyles from '../css/asset-picker.css?inline';
import { useGetPuck, usePuck } from '@puckeditor/core';

function MediaImportControl({ value, onChange, readOnly, id, storagePanel = false, canUse = true }) {
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState('');
 const [files, setFiles] = useState([]);
 const [loading, setLoading] = useState(false);
 const [pickerOpen, setPickerOpen] = useState(false);
 const fileInput = useRef(null);
 const getPuck = useGetPuck();
 function useMedia(media, targetId = getPuck().selectedItem?.props.id) {
   const api = getPuck();
   if (!targetId) return;
   const item = api.getItemById(targetId);
   const selector = api.getSelectorForId(targetId);
   if (item?.type === 'Hero' && selector) api.dispatch({ type: 'replace', destinationIndex: selector.index, destinationZone: selector.zone, data: { ...item, props: { ...item.props, mediaUrl: media.url, mediaType: media.type, mediaEnabled: media.type !== 'none' } } });
 }
 async function loadStorage() {
   setLoading(true);
   try {
     const response = await fetch(document.getElementById('page-editor').dataset.storageUrl, { headers: { Accept: 'application/json' } });
     if (!response.ok) throw new Error('Could not load storage. Please try again.');
     setFiles((await response.json()).files);
   } catch (error) { setError(error.message); }
   finally { setLoading(false); }
 }
 async function removeMedia(file) {
   if (!window.confirm('Delete this file permanently? Pages using it will lose this image or video.')) return;
   setBusy(true); setError('');
   try {
     const response = await fetch(document.getElementById('page-editor').dataset.deleteUrl.replace('__FILE__', encodeURIComponent(file.name)), { method: 'DELETE', headers: { Accept: 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content } });
     if (!response.ok) throw new Error('Could not delete this file. Please try again.');
     setFiles(previous => previous.filter(item => item.name !== file.name));
     if (normalizeHeroMediaUrl(value) === file.url) useMedia({ url: '', type: 'none' });
   } catch (error) { setError(error.message); }
   finally { setBusy(false); }
 }
 async function upload(event) {
   const file = event.target.files?.[0];
   event.target.value = '';
   if (!file) return;
   setError('');
   if (file.size > 50 * 1024 * 1024) { setError('Choose a file smaller than 50 MB.'); return; }
   const targetId = getPuck().selectedItem?.props.id;
   setBusy(true);
   try {
     const body = new FormData();
     body.append('media', file);
     const response = await fetch(document.getElementById('page-editor').dataset.uploadUrl, { method: 'POST', headers: { Accept: 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content }, body });
     const result = await response.json();
     if (!response.ok) throw new Error(Object.values(result.errors ?? {}).flat()[0] ?? result.message ?? 'Upload failed. Please try again.');
     useMedia(result, targetId);
     if (storagePanel || pickerOpen) await loadStorage();
   } catch (error) { setError(error.message); }
   finally { setBusy(false); }
 }
 useEffect(() => { if (storagePanel) loadStorage(); }, [storagePanel]);
 return <div className={storagePanel ? 'hero-media-import storage-panel' : 'hero-media-import'}>
   {storagePanel && <><h2>Storage</h2><p className="hero-control-hint">Your uploaded images and videos.</p></>}
   <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm" hidden disabled={readOnly || busy} onChange={upload} aria-label="Choose hero media" />
   <button type="button" className="hero-upload-card" disabled={readOnly || busy} onClick={() => fileInput.current.click()}>
     <span className="hero-upload-symbol" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V3m-5 5 5-5 5 5M4 16v4h16v-4" /></svg></span>
     <strong>{busy ? 'Uploading…' : 'Upload media'}</strong>
     <span>Choose an image or video from your device</span>
     <span className="hero-upload-badge">Browse files</span>
   </button>
   <p className="hero-upload-formats">JPG, PNG, WebP, GIF, AVIF · MP4, WebM<span>Maximum file size: 50 MB</span></p>
   {!storagePanel && <button type="button" className="hero-storage-choose" disabled={readOnly || busy} aria-expanded={pickerOpen} onClick={() => { const open = !pickerOpen; setPickerOpen(open); if (open) loadStorage(); }}><ControlIcon name="image" />{pickerOpen ? 'Close storage' : 'Choose from Storage'}</button>}
   {error && <p role="alert" className="hero-upload-error">{error}</p>}
   {busy && <span role="status">Updating media…</span>}
   {pickerOpen && <AssetPicker files={files} loading={loading} error={error} selectedUrl={value} onClose={() => setPickerOpen(false)} onSelect={file => { useMedia(file); setPickerOpen(false); }} onRefresh={loadStorage} />}
   {storagePanel && <section className="hero-storage" aria-label="Choose stored media">
     {!canUse && <p className="hero-control-hint">Select a hero on the canvas to use a file.</p>}
     <div className="hero-storage-body">
       <button type="button" className="hero-storage-refresh" disabled={loading || busy} onClick={loadStorage}>Refresh files</button>
       {loading ? <p role="status" className="hero-control-hint">Loading storage…</p> : files.length === 0 ? <p className="hero-control-hint">No media yet. Import an image or video above.</p> : <div className="hero-storage-grid">{files.map(file => <article key={file.name} className="hero-storage-file">
         <div className="hero-storage-preview">{file.type === 'video' ? <video src={file.url} controls preload="metadata" /> : <img src={file.url} alt={file.name} loading="lazy" />}</div>
         <span className="hero-storage-name" title={file.name}>{file.name}</span>
         <small>{file.type === 'video' ? 'Video' : 'Image'} · {file.size < 1048576 ? `${Math.ceil(file.size / 1024)} KB` : `${(file.size / 1048576).toFixed(1)} MB`}</small>
         <div className="hero-storage-actions"><button type="button" disabled={busy || readOnly || !canUse} onClick={() => { useMedia(file); if (!storagePanel) setPickerOpen(false); }}>{normalizeHeroMediaUrl(value) === file.url ? 'Selected' : 'Use'}</button>{storagePanel && <button type="button" disabled={busy || readOnly} aria-label={`Delete ${file.name}`} title="Delete from storage" onClick={() => removeMedia(file)}>Delete</button>}</div>
       </article>)}</div>}
     </div>
   </section>}
 </div>;
}

function AssetPicker({ files, loading, error, selectedUrl, onClose, onSelect, onRefresh }) {
 const dialog = useRef(null);
 const [query, setQuery] = useState('');
 const [filter, setFilter] = useState('all');
 useEffect(() => { const element = dialog.current; element.showModal(); return () => element.close(); }, []);
 const matches = files.filter(file => (filter === 'all' || file.type === filter) && `${file.displayName ?? file.name} ${file.name}`.toLowerCase().includes(query.trim().toLowerCase()));
 return createPortal(<dialog ref={dialog} className="asset-picker" aria-labelledby="asset-picker-title" onCancel={onClose} onClick={event => { if (event.target === dialog.current) onClose(); }}>
   <style>{assetPickerStyles}</style>
   <div className="asset-picker-shell">
     <aside className="asset-picker-sidebar">
       <h2 id="asset-picker-title">Choose an asset</h2><p>Your media, ready to use.</p>
       <nav aria-label="Asset filters">{[{ value: 'all', label: 'All media', icon: '▦' }, { value: 'image', label: 'Images', icon: 'image' }, { value: 'video', label: 'Videos', icon: 'video' }].map(item => <button type="button" key={item.value} aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>{item.icon === '▦' ? <span aria-hidden="true">▦</span> : <ControlIcon name={item.icon} />}<span>{item.label}</span><small>{files.filter(file => item.value === 'all' || file.type === item.value).length}</small></button>)}</nav>
       <small className="asset-picker-tip">Select an asset to add it to your hero.</small>
     </aside>
     <main className="asset-picker-main">
       <header className="asset-picker-header"><div className="asset-picker-search"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="10" cy="10" r="6" /><path d="m15 15 6 6" /></svg><input type="search" autoFocus aria-label="Search assets" placeholder="Search your images and videos…" value={query} onChange={event => setQuery(event.target.value)} /></div><button type="button" className="asset-picker-close" aria-label="Close asset picker" onClick={onClose}>×</button></header>
       <div className="asset-picker-scroll"><div className="asset-picker-results"><h3>{query ? 'Search results' : filter === 'all' ? 'Your media' : filter === 'image' ? 'Images' : 'Videos'} <span>{matches.length}</span></h3><button type="button" disabled={loading} onClick={onRefresh}>Refresh</button></div>
         {error && <p role="alert" className="hero-upload-error">{error}</p>}
         {loading ? <div className="asset-picker-empty" role="status">Loading your assets…</div> : matches.length === 0 ? <div className="asset-picker-empty"><strong>{files.length ? 'No matching assets' : 'Your storage is empty'}</strong><p>{files.length ? 'Try another name or media filter.' : 'Upload an image or video to see it here.'}</p></div> : <div className="asset-picker-grid">{matches.map(file => <article key={file.name} className="asset-picker-item">
           <button type="button" className="asset-picker-thumbnail" aria-label={`Use ${file.displayName ?? file.name}`} onClick={() => onSelect(file)}>{file.type === 'video' ? <video src={file.url} muted playsInline preload="metadata" /> : <img src={file.url} alt="" loading="lazy" />}<span className="asset-picker-type">{file.type === 'video' ? 'Video' : 'Image'}</span>{normalizeHeroMediaUrl(selectedUrl) === file.url && <span className="asset-picker-selected">✓ Selected</span>}<span className="asset-picker-use">Use asset</span></button>
           <strong title={file.displayName ?? file.name}>{file.displayName ?? file.name}</strong><small>{file.size < 1048576 ? `${Math.ceil(file.size / 1024)} KB` : `${(file.size / 1048576).toFixed(1)} MB`}</small>
         </article>)}</div>}
       </div>
     </main>
   </div>
 </dialog>, document.body);
}

const heroFieldSections = [
 { title: 'Text', icon: 'Aa', description: 'Content and typography', fields: ['blocks'] },
 { title: 'Layout', icon: '▤', description: 'Composition and alignment', fields: ['layout', 'alignment'] },
 { title: 'Size & spacing', icon: '↔', description: 'Dimensions and breathing room', fields: ['minHeight', 'contentWidth', 'paddingY', 'gap'] },
 { title: 'Background', icon: '◐', description: 'Hero background color', fields: ['backgroundColor'] },
 { title: 'Media', icon: '▧', description: 'Images and videos', fields: ['mediaEnabled', 'mediaUrl', 'mediaAlt', 'mediaHeight', 'mediaFit', 'overlay'] },
];
export function HeroFields({ children }) {
 const { selectedItem } = usePuck();
 if (selectedItem?.type !== 'Hero') return <>{children}</>;
 const fields = React.Children.toArray(children);
 const groupedNames = new Set(heroFieldSections.flatMap(section => section.fields));
 return <div className="hero-settings" key={selectedItem.props.id}>
   <div className="hero-settings-heading"><strong>Hero settings</strong><span>Design your first impression</span></div>
   {heroFieldSections.map(section => <details className="hero-settings-section" key={section.title} open>
     <summary><span className="hero-settings-icon" aria-hidden="true">{section.icon}</span><span><strong>{section.title}</strong><small>{section.description}</small></span><span className="hero-settings-chevron" aria-hidden="true">›</span></summary>
     <div className="hero-settings-section-body">{section.fields.map(name => fields.find(field => field.props.fieldName === name))}</div>
   </details>)}
   {fields.filter(field => !groupedNames.has(field.props.fieldName))}
 </div>;
}

export function StoragePanel() {
 const { selectedItem } = usePuck();
 const isHero = selectedItem?.type === 'Hero';
 return <MediaImportControl storagePanel canUse={isHero} value={isHero ? selectedItem.props.mediaUrl : ''} />;
}

function ControlIcon({ name }) {
 const paths = {
   left: 'M4 5h16M4 10h10M4 15h16M4 20h10', center: 'M4 5h16M7 10h10M4 15h16M7 20h10', right: 'M4 5h16M10 10h10M4 15h16M10 20h10',
   image: 'M3 3h18v18H3zM3 17l6-6 5 5 3-3 4 4M16 7h.01', video: 'M3 5h12v14H3zM15 10l6-4v12l-6-4', none: 'M5 5l14 14M19 5L5 19',
   cover: 'M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5M8 8h8v8H8z', contain: 'M3 3h18v18H3zM7 8h10v8H7z',
 };
 return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.image} /></svg>;
}
function LayoutIcon({ value }) {
 return <svg viewBox="0 0 80 48" fill="none" aria-hidden="true">
   <rect x="1" y="1" width="78" height="46" rx="5" fill={value === 'background' ? '#dce8d5' : '#fff'} stroke="currentColor" opacity=".55" />
   {(value === 'media-left' || value === 'media-right') && <rect x={value === 'media-left' ? 7 : 45} y="8" width="28" height="32" rx="3" fill="#dce8d5" />}
   {value === 'stacked' && <rect x="20" y="29" width="40" height="12" rx="3" fill="#dce8d5" />}
   <path d={value === 'media-left' ? 'M42 15h29M42 21h23M42 27h26' : value === 'media-right' ? 'M8 15h29M8 21h23M8 27h26' : 'M20 12h40M26 18h28M29 24h22'} stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
 </svg>;
}
const choices = (label, values, visual = false) => ({ type: 'custom', label, render: ({ value, onChange, readOnly }) => <div className={visual ? 'hero-layout-options' : 'hero-icon-options'} role="group" aria-label={label}>
 {values.map(option => <button type="button" key={option} title={option.replaceAll('-', ' ')} aria-label={option.replaceAll('-', ' ')} aria-pressed={value === option} disabled={readOnly} onClick={() => onChange(option)}>
   {visual ? <><LayoutIcon value={option} /><span>{({ stacked: 'Stacked', 'media-left': 'Media left', 'media-right': 'Media right', background: 'Background' })[option]}</span></> : ['left', 'center', 'right', 'image', 'video', 'none', 'cover', 'contain'].includes(option) ? <ControlIcon name={option} /> : <span style={{ fontStyle: option === 'italic' ? 'italic' : undefined }}>{option === 'italic' ? 'I' : option === 'normal' ? 'Aa' : option}</span>}
 </button>)}
 </div> });
const select = choices;
const number = (label, min, max, step = 1) => ({ type: 'number', label, min, max, step });
function DimensionControl({ value, onChange, readOnly, label, min, max, defaultValue, icon, unit = 'px' }) {
 const current = value ?? defaultValue;
 return <div className="hero-dimension-control">
   <div className="hero-dimension-row">
     <span className="hero-dimension-title"><span aria-hidden="true">{icon}</span>{label}</span>
     <div className="hero-dimension-value"><input type="number" aria-label={label} value={current} min={min} max={max} disabled={readOnly} onChange={event => { if (event.target.value !== '') onChange(Number(event.target.value)); }} onBlur={event => onChange(Math.min(max, Math.max(min, Number(event.target.value))))} /><span aria-hidden="true">{unit}</span></div>
   </div>
   <input type="range" aria-label={`Adjust ${label.toLowerCase()}`} min={min} max={max} value={current} disabled={readOnly} onChange={event => onChange(Number(event.target.value))} style={{ '--range-progress': `${Math.min(100, Math.max(0, (current - min) / (max - min) * 100))}%` }} />
 </div>;
}
const dimension = (label, min, max, defaultValue, icon, unit = 'px') => ({ type: 'custom', label, render: props => <DimensionControl {...props} label={label} min={min} max={max} defaultValue={defaultValue} icon={icon} unit={unit} /> });
const color = (label, defaultColor = '#242e2b') => ({ type: 'custom', label, render: ({ value, onChange, id, readOnly }) => <div className="hero-color-control"><input id={id} aria-label={label} type="color" disabled={readOnly} value={value || defaultColor} onChange={event => onChange(event.target.value)} /><span>{value || defaultColor}</span></div> });
function TextBlocksControl({ value = [], onChange, readOnly }) {
 const update = (index, key, next) => onChange(value.map((block, position) => position === index ? { ...block, [key]: next } : block));
 const move = (index, direction) => { const next = [...value]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; onChange(next); };
 return <div className="hero-text-blocks">
   <p className="hero-control-hint">Write your story. Open a block to style it.</p>
   {value.map((block, index) => <details className="hero-text-block" key={index}>
     <summary><span className="hero-block-type">{(block.tag || 'p').toUpperCase()}</span><span>{block.content || 'Empty text'}</span><span aria-hidden="true">⌄</span></summary>
     <div className="hero-block-body">
       <textarea aria-label={`Text block ${index + 1}`} value={block.content ?? ''} disabled={readOnly} onChange={event => update(index, 'content', event.target.value)} rows={3} />
       <div className="hero-style-grid">
         {Object.entries({ tag: select('Type', ['h1', 'h2', 'h3', 'p']), fontSize: number('Size · px', 8, 120), weight: { type: 'select', label: 'Weight', options: ['400', '500', '600', '700', '800'].map(value => ({ value, label: value })) }, italic: select('Style', ['normal', 'italic']), color: color('Color'), lineHeight: number('Line height', 1, 3, .1), letterSpacing: number('Spacing · px', -5, 20, .1) }).map(([key, field]) => <label key={key} className="hero-style-field"><span>{field.label}</span>{field.type === 'custom' ? field.render({ value: block[key], onChange: next => update(index, key, next), readOnly }) : field.type === 'select' ? <select aria-label={field.label} disabled={readOnly} value={block[key] ?? '400'} onChange={event => update(index, key, event.target.value)}>{field.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <input aria-label={field.label} disabled={readOnly} type="number" min={field.min} max={field.max} step={field.step} value={block[key] ?? (key === 'lineHeight' ? 1.5 : key === 'fontSize' ? 20 : 0)} onChange={event => { if (event.target.value !== '') update(index, key, Number(event.target.value)); }} />}</label>)}
       </div>
       <div className="hero-block-actions"><button type="button" title="Move up" aria-label="Move text up" disabled={readOnly || index === 0} onClick={() => move(index, -1)}>↑</button><button type="button" title="Move down" aria-label="Move text down" disabled={readOnly || index === value.length - 1} onClick={() => move(index, 1)}>↓</button><button type="button" className="hero-remove-block" disabled={readOnly} onClick={() => onChange(value.filter((_, position) => position !== index))}>Remove</button></div>
     </div>
   </details>)}
   <button type="button" className="hero-add-block" disabled={readOnly || value.length >= 30} onClick={() => onChange([...value, { ...heading, content: 'New text', tag: 'p', fontSize: 20 }])}>+ Add text block</button>
 </div>;
}
const heading = { content: 'Your next chapter starts here.', tag: 'h1', fontSize: 64, weight: '700', color: '#242e2b', letterSpacing: -2, lineHeight: 1.1, italic: 'normal' };
export const legacyHeroBlocks = props => [
  { content: 'A SPACE FOR YOUR IDEAS', tag: 'p', fontSize: 11, weight: '700', color: '#748276', letterSpacing: 2, lineHeight: 1.5, italic: 'normal' },
  { ...heading, content: props.title ?? heading.content },
  { content: props.text ?? 'A beautiful space for your next big idea.', tag: 'p', fontSize: 19, weight: '400', color: '#6c7771', letterSpacing: 0, lineHeight: 1.7, italic: 'normal' },
];
export const heroConfig = {
  label: 'Hero section',
  fields: {
    blocks: { type: 'custom', label: 'Text blocks', render: props => <TextBlocksControl {...props} /> },
    backgroundColor: color('Hero background', '#eef2e8'), layout: choices('Hero layout', ['stacked', 'media-left', 'media-right', 'background'], true), alignment: select('Text alignment', ['left', 'center', 'right']),
    minHeight: dimension('Min. height', 0, 1200, 400, '↕'), paddingY: dimension('Vertical padding', 0, 240, 100, '↥'), contentWidth: dimension('Content width', 280, 1600, 1120, '↔'), gap: dimension('Text spacing', 0, 100, 24, '≡'),
    mediaEnabled: { type: 'custom', label: 'Media', render: ({ value, onChange, readOnly }) => <div className="hero-media-toggle"><span><strong>Show media</strong><small>File type is detected automatically</small></span><button type="button" role="switch" aria-label="Show hero media" aria-checked={value ?? true} disabled={readOnly} onClick={() => onChange(!(value ?? true))}><span /></button></div> }, mediaUrl: { type: 'custom', label: 'Import media', render: props => <MediaImportControl {...props} /> }, mediaAlt: { type: 'custom', label: 'Image description', render: ({ value, onChange, readOnly, id }) => <div className="hero-compact-text"><label htmlFor={id}>Image description</label><input id={id} type="text" value={value ?? ''} placeholder="e.g. Mountain landscape at sunrise" disabled={readOnly} onChange={event => onChange(event.target.value)} /><small>Describe what’s in the image for screen readers.</small></div> }, mediaHeight: dimension('Media height', 100, 1000, 360, '↕'), mediaFit: select('Media fit', ['cover', 'contain']), overlay: dimension('Dark overlay', 0, 100, 35, '◐', '%'),
  },
  defaultProps: { blocks: legacyHeroBlocks({}), backgroundColor: '#eef2e8', layout: 'stacked', alignment: 'center', minHeight: 400, paddingY: 100, contentWidth: 1120, gap: 24, mediaEnabled: true, mediaType: 'none', mediaUrl: '', mediaAlt: '', mediaHeight: 360, mediaFit: 'cover', overlay: 35 },
  render: Hero,
};
export const normalizeHeroMediaUrl = url => (url ?? '').replace(/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(\/storage\/hero-media\/)/i, '$1');
function HeroMedia({ source, type, alt, height, fit, background }) {
 const [failed, setFailed] = useState(false);
 const [ratio, setRatio] = useState(null);
 const fitAsset = fit === 'contain' && !background && ratio && !failed;
 return <div className={`hero-media-surface${fitAsset ? ' hero-media-surface--asset' : ''}`} style={fitAsset ? { width: `min(100%, ${height * ratio}px)` } : { height }}>
   {!source || failed ? <div className="hero-media-placeholder" role="img" aria-label="Media placeholder" /> : type === 'video' ? <video src={source} controls={!background} autoPlay={background} muted={background} loop={background} playsInline onLoadedMetadata={event => setRatio(event.currentTarget.videoWidth / event.currentTarget.videoHeight)} onError={() => setFailed(true)} style={{ height: '100%', objectFit: fit }} /> : <img src={source} alt={background ? '' : alt} onLoad={event => setRatio(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight)} onError={() => setFailed(true)} style={{ height: '100%', objectFit: fit }} />}
 </div>;
}
function Hero(props) {
  const { blocks = legacyHeroBlocks(props), backgroundColor = '#eef2e8', layout = 'stacked', alignment = 'center', minHeight = 400, paddingY = 100, contentWidth = 1120, gap = 24, mediaEnabled = true, mediaType = 'none', mediaUrl = '', mediaAlt = '', mediaHeight = 360, mediaFit = 'cover', overlay = 35 } = props;
  const source = normalizeHeroMediaUrl(mediaUrl);
  const hasMedia = mediaEnabled && mediaType !== 'none' && /^(https?:\/\/|\/(?!\/))/i.test(source);
  const media = <HeroMedia key={`${source}-${mediaType}`} source={hasMedia ? source : ''} type={mediaType} alt={mediaAlt} height={mediaHeight} fit={mediaFit} background={layout === 'background'} />;
  return <section className={`hero-builder hero-builder--${layout}`} style={{ backgroundColor, minHeight, padding: `${paddingY}px 24px`, textAlign: alignment, '--hero-width': `${contentWidth}px`, '--hero-gap': `${gap}px` }}>
    {mediaEnabled && layout === 'background' && <div className="hero-builder-background">{media}{hasMedia && <div style={{ backgroundColor: '#000', opacity: overlay / 100 }} />}</div>}
    <div className="hero-builder-inner">
      <div className="hero-builder-text">{blocks.map((block, index) => {
        const Tag = ['h1', 'h2', 'h3', 'p'].includes(block.tag) ? block.tag : 'p';
        return <Tag key={index} style={{ fontSize: `min(${block.fontSize ?? 20}px, ${Tag === 'p' ? '7' : '12'}vw)`, fontWeight: block.weight ?? '400', color: block.color ?? '#242e2b', fontStyle: block.italic ?? 'normal', letterSpacing: `${block.letterSpacing ?? 0}px`, lineHeight: block.lineHeight ?? 1.5 }}>{block.content}</Tag>;
      })}</div>
      {mediaEnabled && layout !== 'background' && <div className="hero-builder-media">{media}</div>}
    </div>
  </section>;
}
