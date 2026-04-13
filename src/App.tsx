import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Cpu, BarChart2, Camera, RotateCcw, Loader2, CheckCircle2, AlertCircle, Zap, Eye, EyeOff } from 'lucide-react';
import VRMViewer, { VRMHandle } from './components/VRMViewer';

// VRM URL — public 폴더에 넣어야 함
const VRM_URL = '/invisible_man.vrm';

interface GameState {
  hp: number; xp: number; trust: number;
  stats: Record<string, number>;
  world: Record<string, number>;
}
const INIT: GameState = {
  hp: 75, xp: 30, trust: 100,
  stats: { '집중력': 40, '실행력': 30, '멘탈': 50, '자기관리': 20, '창의력': 35 },
  world: { roomCleanliness: 60, fogLevel: 0, starCount: 2, dungeonThreat: 0 },
};

type Shader = 'toon' | 'glow' | 'normal';
type PartKey = 'skin' | 'tops' | 'bottoms' | 'shoes';
const PARTS: { key: PartKey; label: string; icon: string }[] = [
  { key: 'tops',    label: '상의', icon: '👕' },
  { key: 'bottoms', label: '하의', icon: '👖' },
  { key: 'shoes',   label: '신발', icon: '👟' },
  { key: 'skin',    label: '피부', icon: '👻' },
];
const SHADERS: { key: Shader; label: string; icon: string }[] = [
  { key: 'toon',   label: '페이퍼 마리오', icon: '🎨' },
  { key: 'glow',   label: '홀로그램',      icon: '✨' },
  { key: 'normal', label: '기본',          icon: '🔵' },
];

export default function App() {
  const [tab, setTab]         = useState(0);
  const [gs, setGs]           = useState<GameState>(INIT);
  const [image, setImage]     = useState<string | null>(null);
  const [busy, setBusy]       = useState(false);
  const [result, setResult]   = useState<any>(null);
  const [apiKey, setApiKey]   = useState('');
  const [bubble, setBubble]   = useState('오늘도 화이팅이야!');
  const [anim, setAnim]       = useState<'idle'|'jump'|'shake'|'tilt'>('idle');
  const [toast, setToast]     = useState<string|null>(null);
  const [vrmReady, setVrmReady] = useState(false);
  const [vrmErr, setVrmErr]   = useState<string|null>(null);
  const [autoRot, setAutoRot] = useState(true);
  const [shader, setShader]   = useState<Shader>('toon');
  const [olThick, setOlThick] = useState(3);
  const [olColor, setOlColor] = useState('#000000');
  const [partVis, setPartVis] = useState<Record<PartKey, boolean>>({
    skin: false, tops: true, bottoms: true, shoes: true,
  });

  const vrmHandle = useRef<VRMHandle | null>(null);

  // localStorage 로드
  useEffect(() => {
    try {
      const d = localStorage.getItem('dv_state');
      if (d) setGs(JSON.parse(d));
      const c = localStorage.getItem('dv_custom');
      if (c) setPartVis(JSON.parse(c));
    } catch {}
  }, []);

  // 저장
  useEffect(() => {
    try { localStorage.setItem('dv_state', JSON.stringify(gs)); } catch {}
  }, [gs]);
  useEffect(() => {
    try { localStorage.setItem('dv_custom', JSON.stringify(partVis)); } catch {}
  }, [partVis]);

  // idle 말풍선
  useEffect(() => {
    const phrases = ['오늘 퀘스트 어때?', '약은 챙겼어?', '수분 보충 했어?', '잠 잘 잤어?', '오늘도 할 수 있어!'];
    let i = 0;
    const t = setInterval(() => setBubble(phrases[i++ % phrases.length]), 8000);
    return () => clearInterval(t);
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const trigAnim = (type: typeof anim) => {
    setAnim(type);
    if (type !== 'tilt') setTimeout(() => setAnim('idle'), 1000);
  };

  // 파츠 토글
  const togglePart = (key: PartKey) => {
    const next = !partVis[key];
    setPartVis(p => ({ ...p, [key]: next }));
    vrmHandle.current?.setPartVisible(key, next);
  };

  // 셰이더
  const changeShader = (s: Shader) => {
    setShader(s);
    vrmHandle.current?.setShader(s);
  };

  // 아웃라인
  const changeOutline = (t: number, c: string) => {
    setOlThick(t); setOlColor(c);
    vrmHandle.current?.setOutline(t, c);
  };

  // 파일 선택
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setImage(ev.target?.result as string);
      setBubble('사진 받았어! 확인해볼게~');
      trigAnim('shake');
    };
    reader.readAsDataURL(file);
  };

  // AI 인증
  const runVerify = async () => {
    if (!image) return;
    setBusy(true); setResult(null); setBubble('확인하는 중...');
    const b64 = image.split(',')[1];
    const prompt = `DigiVerse 퀘스트 인증. 퀘스트:"약 복용하기"\n위변조(최우선→fraud):스크린샷/인터넷이미지/약없는사진\n판정:pass(85~100)/partial(40~84)/fail(0~39)/fraud\nJSON만(마크다운없이):{"rate":숫자,"verdict":"pass|partial|fail|fraud","title":"제목","reason":"2문장"}`;
    try {
      if (!apiKey) { setTimeout(() => applyResult({ rate: 85, verdict: 'pass', title: '약 복용 확인!', reason: 'API 키 없이 데모 모드야. 실제로는 AI가 판단해줘!' }), 1500); return; }
      const isClaude = apiKey.startsWith('sk-ant-');
      let res: any;
      if (isClaude) {
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
          body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 200, messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } }, { type: 'text', text: prompt }] }] })
        });
        const d = await resp.json();
        res = JSON.parse(d.content[0].text.replace(/```json|```/g, '').trim());
      } else {
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ inline_data: { mime_type: 'image/jpeg', data: b64 } }, { text: prompt }] }] })
        });
        const d = await resp.json();
        res = JSON.parse(d.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim());
      }
      applyResult(res);
    } catch (err: any) { setBusy(false); showToast('오류: ' + err.message); }
  };

  const applyResult = (r: any) => {
    setBusy(false); setResult(r);
    const isFraud = r.verdict === 'fraud';
    const eff = isFraud ? 0 : r.rate;
    const hpD = Math.round(15 * eff / 100), xpD = Math.round(20 * eff / 100);
    const trD = isFraud ? -20 : r.verdict === 'pass' ? 8 : r.verdict === 'partial' ? 3 : -5;
    setGs(p => ({
      ...p,
      hp: Math.min(100, p.hp + hpD), xp: Math.min(100, p.xp + xpD),
      trust: Math.min(100, Math.max(0, p.trust + trD)),
      stats: { ...p.stats, '멘탈': Math.min(100, p.stats['멘탈'] + Math.round(5 * eff / 100)) }
    }));
    if (isFraud) { trigAnim('shake'); setBubble('인터넷 사진이야? 🚨'); showToast('🚨 위변조 감지 TRUST -20'); }
    else if (r.verdict === 'pass') { trigAnim('jump'); setBubble('완료!! 잘했어 👏'); showToast('✨ 퀘스트 완료!'); }
    else { trigAnim('tilt'); setBubble('다시 찍어볼까?'); showToast(r.verdict === 'partial' ? `⚡ 부분 완료 ${r.rate}%` : '❌ 인증 실패'); }
  };

  const Bar = ({ label, val, color }: { label: string; val: number; color: string }) => (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[10px] text-mt tracking-wider w-12">{label}</span>
      <div className="flex-1 h-2 bg-bd/80 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${val}%` }} className={`h-full rounded-full ${color}`} />
      </div>
      <span className="font-mono text-xs text-tx w-8 text-right">{val}</span>
    </div>
  );

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col relative pb-20 overflow-x-hidden">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ y: 20, opacity: 0, x: '-50%' }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
            className="fixed bottom-24 left-1/2 z-[999] bg-sf/95 border border-ac rounded-xl px-5 py-3 text-sm text-tx backdrop-blur-md shadow-xl whitespace-nowrap">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 w-full px-4 pt-8 flex flex-col items-center gap-6">

        {/* ── TAB 0: HOME ── */}
        {tab === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full flex flex-col items-center gap-6">
            <div className="text-center">
              <div className="font-mono text-[10px] tracking-[4px] text-mt uppercase mb-1">DigiVerse</div>
              <div className="text-2xl font-bold text-white">나의 <span className="text-ac drop-shadow-[0_0_10px_rgba(192,132,252,0.6)]">요정 비서</span></div>
            </div>

            {/* 미니 VRM 뷰어 */}
            <div className="relative w-full h-[420px]">
              <div className={`absolute top-0 left-1/2 -translate-x-1/2 bg-sf/95 border border-bd rounded-xl px-4 py-2 text-xs text-tx whitespace-nowrap z-10 transition-opacity ${bubble ? 'opacity-100' : 'opacity-0'}`}>
                {bubble}
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-bd" />
              </div>
              <div className={`w-full h-full rounded-2xl overflow-hidden border border-bd bg-sf/50 ${anim === 'jump' ? 'animate-jump' : anim === 'shake' ? 'animate-shake' : anim === 'tilt' ? 'animate-tilt' : 'animate-idle'}`}>
                <VRMViewer vrmUrl={VRM_URL} animation={anim} mode="room"
                  onLoaded={() => setVrmReady(true)}
                  onError={msg => setVrmErr(msg)}
                />
              </div>
              {!vrmReady && !vrmErr && (
                <div className="absolute inset-0 flex items-center justify-center gap-2 text-mt font-mono text-xs">
                  <Loader2 size={16} className="animate-spin" /> VRM 로딩 중...
                </div>
              )}
              {vrmErr && <div className="absolute inset-0 flex items-center justify-center text-rd text-xs font-mono px-4 text-center">{vrmErr}</div>}
            </div>

            {/* Status Bars */}
            <div className="w-full bg-sf border border-bd rounded-xl p-4 flex flex-col gap-3">
              <Bar label="HP"    val={gs.hp}    color="bg-gradient-to-r from-red-900 to-rd" />
              <Bar label="XP"    val={gs.xp}    color="bg-gradient-to-r from-indigo-900 to-ac2" />
              <Bar label="TRUST" val={gs.trust} color="bg-gradient-to-r from-purple-900 to-ac" />
            </div>

            {/* Quest Card */}
            <div className="w-full bg-sf border border-bd rounded-xl p-4 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-ac/10 border border-ac/30 text-ac tracking-wider">📸 사진 인증</span>
                <span className="text-sm font-medium text-white">약 복용하기</span>
              </div>
              <p className="text-xs text-mt leading-relaxed">약을 복용한 사진을 선택하거나 촬영해줘.</p>
              <div className="text-xs text-yw bg-yw/5 border border-yw/20 rounded-lg p-3 leading-relaxed">
                <strong className="block mb-1">🤖 AI 위변조 감지 중</strong>인터넷 이미지 감지 시 fraud → TRUST -20
              </div>
              {!image ? (
                <label className="flex flex-col items-center justify-center gap-2 p-6 bg-ac/10 border-2 border-dashed border-ac/30 rounded-xl cursor-pointer hover:bg-ac/20 transition-colors">
                  <Camera size={32} className="text-ac" />
                  <span className="text-sm font-medium text-ac">사진 선택 / 촬영</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
                </label>
              ) : (
                <div className="flex flex-col gap-3">
                  <img src={image} className="w-full max-h-48 object-cover rounded-lg border border-bd" alt="preview" />
                  <button onClick={() => setImage(null)} className="text-xs text-mt flex items-center justify-center gap-1">
                    <RotateCcw size={14} /> 다시 선택
                  </button>
                </div>
              )}
              <div className="h-px bg-gradient-to-r from-transparent via-bd to-transparent" />
              <div className="flex flex-col gap-2">
                <label className="font-mono text-[9px] tracking-widest text-mt uppercase">Claude / Gemini API Key</label>
                <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
                  placeholder="sk-ant-... 또는 AIza..."
                  className="bg-bd/40 border border-bd rounded-lg px-3 py-2 font-mono text-xs text-tx outline-none focus:border-ac transition-colors" />
                <span className="text-[10px] text-mt">
                  <a href="https://console.anthropic.com/settings/keys" target="_blank" className="text-ac2">Claude 키</a>
                  {' · '}
                  <a href="https://aistudio.google.com/apikey" target="_blank" className="text-ac2">Gemini 키</a>
                  {' · 없으면 데모 결과 확인 가능'}
                </span>
              </div>
              <button disabled={!image || busy} onClick={runVerify}
                className="w-full py-3 bg-gradient-to-br from-ac to-purple-700 rounded-xl text-white font-bold text-sm shadow-lg shadow-ac/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {busy ? <><Loader2 className="animate-spin" size={18} /> 분석 중...</> : 'AI 인증 시작'}
              </button>
              {result && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-2 p-4 bg-bd/30 rounded-xl border border-bd flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${result.verdict === 'pass' ? 'bg-gn/20 border border-gn/30 text-gn' : result.verdict === 'fraud' ? 'bg-rd/20 border border-rd/30 text-rd' : 'bg-yw/20 border border-yw/30 text-yw'}`}>
                      {result.verdict === 'pass' ? <CheckCircle2 size={20}/> : result.verdict === 'fraud' ? <AlertCircle size={20}/> : <Zap size={20}/>}
                    </div>
                    <div>
                      <div className={`text-sm font-bold ${result.verdict === 'pass' ? 'text-gn' : result.verdict === 'fraud' ? 'text-rd' : 'text-yw'}`}>{result.title}</div>
                      <div className="text-[10px] text-mt uppercase">{result.verdict}</div>
                    </div>
                    <div className="ml-auto text-2xl font-mono font-bold text-white">{result.rate}%</div>
                  </div>
                  <p className="text-xs text-mt leading-relaxed p-2 bg-bg/50 rounded-lg border-l-2 border-ac">{result.reason}</p>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── TAB 1: 3D VIEWER ── */}
        {tab === 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full flex flex-col gap-4">
            <div className="font-mono text-[11px] tracking-widest text-ac uppercase">// 3D 캐릭터</div>

            {/* 뷰어 */}
            <div className="w-full aspect-[3/4] bg-sf/80 border border-bd rounded-2xl overflow-hidden relative">
              <VRMViewer vrmUrl={VRM_URL} animation={anim} handle={vrmHandle} mode="full"
                onLoaded={() => setVrmReady(true)} onError={msg => setVrmErr(msg)} />
              {!vrmReady && !vrmErr && (
                <div className="absolute inset-0 flex items-center justify-center gap-2 text-mt font-mono text-xs">
                  <Loader2 size={16} className="animate-spin" /> VRM 로딩 중...
                </div>
              )}
              {vrmErr && <div className="absolute inset-0 flex items-center justify-center text-rd text-xs p-4 text-center">{vrmErr}</div>}
            </div>

            {/* 카메라 */}
            <div className="font-mono text-[9px] tracking-widest text-mt uppercase">// 카메라</div>
            <div className="flex gap-2 flex-wrap">
              {(['full','upper','face'] as const).map(p => (
                <button key={p} onClick={() => vrmHandle.current?.camPreset(p)}
                  className="px-3 py-1.5 bg-bd/60 border border-bd rounded-lg text-xs text-mt hover:text-ac hover:border-ac transition-colors font-mono">
                  {p === 'full' ? '전신' : p === 'upper' ? '상반신' : '얼굴'}
                </button>
              ))}
              <button onClick={() => vrmHandle.current?.resetCam()}
                className="px-3 py-1.5 bg-bd/60 border border-bd rounded-lg text-xs text-mt hover:text-ac hover:border-ac transition-colors font-mono">
                ↺ 리셋
              </button>
              <button onClick={() => { const next = vrmHandle.current?.toggleAutoRot(); if (next !== undefined) setAutoRot(next); }}
                className={`px-3 py-1.5 border rounded-lg text-xs font-mono transition-colors ${autoRot ? 'border-ac text-ac bg-ac/10' : 'border-bd text-mt bg-bd/60'}`}>
                자동 회전
              </button>
            </div>

            {/* 파츠 토글 */}
            <div className="font-mono text-[9px] tracking-widest text-mt uppercase">// 파츠 표시</div>
            <div className="grid grid-cols-2 gap-2">
              {PARTS.map(p => (
                <button key={p.key} onClick={() => togglePart(p.key)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${partVis[p.key] ? 'border-ac bg-ac/8' : 'border-bd bg-bd/30'}`}>
                  <span className="text-xl">{p.icon}</span>
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="text-xs font-medium text-tx">{p.label}</span>
                    <span className={`font-mono text-[9px] ${partVis[p.key] ? 'text-gn' : 'text-mt'}`}>
                      {partVis[p.key] ? '표시 중' : '숨김'}
                    </span>
                  </div>
                  <span className="ml-auto">{partVis[p.key] ? <Eye size={14} className="text-ac"/> : <EyeOff size={14} className="text-mt"/>}</span>
                </button>
              ))}
            </div>

            {/* 셰이더 */}
            <div className="font-mono text-[9px] tracking-widest text-mt uppercase">// 셰이더</div>
            <div className="grid grid-cols-2 gap-2">
              {SHADERS.map(s => (
                <button key={s.key} onClick={() => changeShader(s.key)}
                  className={`p-3 rounded-xl border text-sm transition-all text-left ${shader === s.key ? 'border-ac bg-ac/10 text-ac' : 'border-bd bg-bd/30 text-tx'}`}>
                  {s.icon} {s.label}
                </button>
              ))}
            </div>

            {/* 아웃라인 */}
            <div className="font-mono text-[9px] tracking-widest text-mt uppercase">// 아웃라인</div>
            <div className="bg-sf border border-bd rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-mt flex-1">두께</span>
                <input type="range" min={0} max={12} value={olThick}
                  onChange={e => changeOutline(Number(e.target.value), olColor)}
                  className="flex-[2] accent-purple-400" />
                <span className="font-mono text-[10px] text-ac w-6 text-right">{olThick}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-mt flex-1">색상</span>
                <input type="color" value={olColor} onChange={e => changeOutline(olThick, e.target.value)}
                  className="w-10 h-8 rounded cursor-pointer border-0 bg-transparent" />
              </div>
            </div>

            <p className="text-[10px] text-mt font-mono text-center">드래그: 회전 · 핀치/휠: 줌 · 두 손가락: 이동</p>
          </motion.div>
        )}

        {/* ── TAB 2: STATS ── */}
        {tab === 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full flex flex-col gap-6">
            <div className="font-mono text-[11px] tracking-widest text-ac uppercase">// 인생 스탯</div>
            <div className="bg-sf border border-bd rounded-2xl p-5 flex flex-col gap-4">
              {Object.entries(gs.stats).map(([k, v]) => (
                <div key={k} className="flex items-center gap-4">
                  <span className="text-xs font-medium text-mt w-20">{k}</span>
                  <div className="flex-1 h-1.5 bg-bd/80 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-ac2 to-ac rounded-full transition-all" style={{ width: `${v}%` }} />
                  </div>
                  <span className="font-mono text-[11px] text-tx w-6 text-right">{v}</span>
                </div>
              ))}
            </div>
            <div className="font-mono text-[11px] tracking-widest text-ac uppercase">// 세계 상태</div>
            <div className="bg-sf border border-bd rounded-2xl p-5 flex flex-col gap-3">
              {[
                { label: '🏠 방 청결도', val: gs.world.roomCleanliness },
                { label: '🌫️ 안개 레벨',  val: gs.world.fogLevel, bad: gs.world.fogLevel > 30 },
                { label: '⭐ 별자리 수',  val: gs.world.starCount },
                { label: '⚔️ 던전 위협도', val: gs.world.dungeonThreat, warn: gs.world.dungeonThreat > 20 },
              ].map(w => (
                <div key={w.label} className="flex justify-between items-center py-2 border-b border-bd last:border-0">
                  <span className="text-xs text-mt">{w.label}</span>
                  <span className={`font-mono text-xs ${(w as any).bad ? 'text-rd' : (w as any).warn ? 'text-yw' : 'text-gn'}`}>{w.val}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-bg/95 backdrop-blur-xl border-t border-bd flex justify-around items-center px-2 py-3">
        {[
          { icon: <Home size={20} />, label: '홈' },
          { icon: <Cpu size={20} />, label: '3D' },
          { icon: <BarChart2 size={20} />, label: '스탯' },
        ].map((n, i) => (
          <button key={i} onClick={() => setTab(i)}
            className={`flex flex-col items-center gap-1 px-4 py-1 transition-all duration-300 ${tab === i ? 'text-ac' : 'text-mt'}`}>
            {n.icon}
            <span className="text-[10px] font-medium">{n.label}</span>
            {tab === i && <motion.div layoutId="nav-dot" className="w-1 h-1 bg-ac rounded-full mt-0.5" />}
          </button>
        ))}
      </nav>
    </div>
  );
}
