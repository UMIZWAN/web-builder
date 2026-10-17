import React, { useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Puck } from '@puckeditor/core';
import '@puckeditor/core/puck.css';
import { heroConfig, legacyHeroBlocks, StoragePanel, HeroFields } from './hero';
const text = { type: 'text' };
const textarea = { type: 'textarea' };
function ComponentPreview({ name }) {
 const line = (x, y, width, height = 4, fill = '#d4dcd5') => <rect x={x} y={y} width={width} height={height} rx={height / 2} fill={fill} />;
 return <div className="component-preview">
   <div className="component-preview-image" aria-hidden="true">
     <svg viewBox="0 0 240 140" fill="none">
       <rect x="16" y="14" width="208" height="112" rx="9" fill="white" stroke="#dce3dd" />
       {line(28, 25, 24, 4, '#7d8e80')}{line(172, 25, 12, 3)}{line(190, 25, 12, 3)}{line(208, 25, 5, 3)}
       <path d="M16 37H224" stroke="#edf0eb" />
       {name === 'Hero' && <>
         <rect x="24" y="44" width="192" height="74" rx="4" fill="#eef2e8" />
         {line(97, 55, 46, 3, '#8c9f7e')}{line(61, 67, 118, 7, '#4c6351')}{line(77, 80, 86)}{line(88, 88, 64)}
         <rect x="100" y="101" width="40" height="9" rx="3" fill="#668655" />
       </>}
       {name === 'Text' && <>
         {line(34, 53, 90, 8, '#4c6351')}{line(34, 73, 171)}{line(34, 83, 158)}{line(34, 93, 168)}{line(34, 103, 109)}
       </>}
       {name === 'Features' && <>
         {line(82, 48, 76, 6, '#4c6351')}
         {[30, 93, 156].map(x => <g key={x}>
           <rect x={x} y="65" width="54" height="49" rx="5" fill="#f7f9f4" stroke="#dce3dd" />
           <rect x={x + 7} y="72" width="12" height="12" rx="4" fill="#dce8d2" />
           {line(x + 7, 91, 33, 4, '#7d8e80')}{line(x + 7, 100, 40, 3)}{line(x + 7, 106, 28, 3)}
         </g>)}
       </>}
       {name === 'Button' && <>
         {line(76, 54, 88, 6, '#4c6351')}{line(60, 67, 120)}
         <rect x="75" y="83" width="90" height="24" rx="6" fill="#4c6c42" />
         {line(91, 93, 48, 4, '#ffffff')}<path d="M145 92L148 95L145 98" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
       </>}
     </svg>
   </div>
   <span className="component-preview-label">{config.components[name]?.label ?? name}</span>
 </div>;
}
const config = { components: {
  Hero: heroConfig,
  Text: { label: 'Text section', fields: { title: text, text: textarea }, defaultProps: { title: 'Tell your story', text: 'Share what makes your business special.' }, render: ({ title, text }) => <section className="site-section"><h2>{title}</h2><p className="preserve-lines">{text}</p></section> },
  Features: { label: 'Feature cards', fields: { title: text, items: { type: 'array', arrayFields: { title: text, text: textarea }, getItemSummary: item => item.title } }, defaultProps: { title: 'Made for you', items: [{ title: 'Thoughtful design', text: 'Every detail makes a difference.' }, { title: 'Room to grow', text: 'Built around your next chapter.' }, { title: 'Simply connected', text: 'Bring your ideas together.' }] }, render: ({ title, items }) => <section className="site-section"><h2>{title}</h2><div className="feature-grid">{items.map((item, i) => <article className="feature-card" key={i}><span>✦</span><h3>{item.title}</h3><p>{item.text}</p></article>)}</div></section> },
  Button: { label: 'Call to action', fields: { label: text, href: text }, defaultProps: { label: 'Get in touch', href: '/contact' }, render: ({ label }) => <section className="site-section"><span className="primary">{label}</span></section> }
}};
const editorPlugins = [{
 name: 'storage', label: 'Storage',
 icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10H3z" /><path d="M8 12h8M8 16h5" /></svg>,
 render: StoragePanel,
}];
function Editor({ data, saveUrl }) {
 const currentData = useRef(data);
 const saving = useRef(false);
 const [status, setStatus] = useState('Draft workspace');
 const [busy, setBusy] = useState(false);
 async function save(content, publish) {
   if (saving.current) return;
   saving.current = true;
   setBusy(true); setStatus('Saving…');
   try {
     const response = await fetch(saveUrl, { method: 'PUT', headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content }, body: JSON.stringify({ content, publish }) });
     const result = await response.json();
     if (!response.ok) throw new Error(Object.values(result.errors ?? {}).flat()[0] ?? result.message ?? 'Could not save.');
     setStatus(result.message);
   } catch (error) { setStatus(error.message); }
   finally { saving.current = false; setBusy(false); }
 }
 return <Puck plugins={editorPlugins} config={config} data={data} onPublish={data => save(data, true)} overrides={{ fields: HeroFields, drawerItem: ComponentPreview, headerActions: ({ children }) => <><span role="status" style={{ maxWidth: 300 }}>{status}</span><button className="quiet" disabled={busy} onClick={() => save(currentData.current, false)}>Save draft</button>{children}</> }} onChange={value => { currentData.current = value; }} />;
}
const mount = document.getElementById('page-editor');
if (mount) {
 const editorProps = JSON.parse(document.getElementById('editor-data').textContent);
 editorProps.data.content = (editorProps.data.content ?? []).map(block => block.type === 'Hero' ? { ...block, props: { ...heroConfig.defaultProps, ...block.props, blocks: Array.isArray(block.props.blocks) ? block.props.blocks : legacyHeroBlocks(block.props) } } : block);
 createRoot(mount).render(<Editor {...editorProps} />);
}
