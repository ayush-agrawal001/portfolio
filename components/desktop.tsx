'use client';

import { useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { CliTerminal } from '@/components/cli-terminal';
import { motion } from 'framer-motion';

interface WindowState {
    x: number;
    y: number;
    width: number;
    height: number;
    minimized: boolean;
    maximized: boolean;
    open: boolean;
    prevGeometry: { x: number; y: number; width: number; height: number } | null;
    zIndex: number;
}

interface IconState {
    x: number;
    y: number;
}

interface CursorPos {
    x: number;
    y: number;
}

interface DesktopProps {
    asciiArt: string;
}

// ── GNOME-style system info hooks ──────────────────────────────────────────────
function useNetworkSpeed() {
    const [speed, setSpeed] = useState<string>('-- Mbps');
    useEffect(() => {
        const speeds = ['12.4 Mbps', '8.1 Mbps', '24.7 Mbps', '16.3 Mbps', '31.2 Mbps', '9.8 Mbps'];
        let idx = 0;
        const id = setInterval(() => { setSpeed(speeds[idx % speeds.length]); idx++; }, 3000);
        setSpeed(speeds[0]); return () => clearInterval(id);
    }, []);
    return speed;
}

function useVolume() {
    const [volume, setVolume] = useState(75);
    return { volume, setVolume };
}

function useBattery() {
    const [battery, setBattery] = useState<{ level: number; charging: boolean } | null>(null);
    useEffect(() => {
        let nav: any = navigator;
        if (nav.getBattery) {
            nav.getBattery().then((bat: any) => {
                setBattery({ level: Math.round(bat.level * 100), charging: bat.charging });
                bat.addEventListener('levelchange', () => setBattery({ level: Math.round(bat.level * 100), charging: bat.charging }));
                bat.addEventListener('chargingchange', () => setBattery({ level: Math.round(bat.level * 100), charging: bat.charging }));
            }).catch(() => { setBattery({ level: 82, charging: false }); });
        } else {
            setBattery({ level: 82, charging: false });
        }
    }, []);
    return battery;
}

// ── Icons ──────────────────────────────────────────────────────────────────
function BatteryIcon({ level, charging }: { level: number; charging: boolean }) {
    const color = level <= 20 ? '#f7768e' : level <= 40 ? '#e0af68' : '#9ece6a';
    const fill = Math.max(0, Math.min(1, level / 100));
    return (
        <svg width="22" height="12" viewBox="0 0 22 12" fill="none">
            <rect x="0.5" y="0.5" width="18" height="11" rx="2" stroke={color} strokeWidth="1" />
            <rect x="18" y="3.5" width="3" height="5" rx="1" fill={color} opacity="0.6" />
            <rect x="1.5" y="1.5" width={Math.round(16 * fill)} height="9" rx="1.5" fill={color} />
            {charging && <text x="9" y="10" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">⚡</text>}
        </svg>
    );
}

function VolumeIcon({ volume }: { volume: number }) {
    if (volume === 0) return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#565f89" strokeWidth="2" strokeLinecap="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
        </svg>
    );
    const color = '#c0caf5';
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            {volume > 30 && <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />}
            {volume > 65 && <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />}
        </svg>
    );
}

function WifiIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7aa2f7" strokeWidth="2" strokeLinecap="round">
            <path d="M5 12.55a11 11 0 0 1 14.08 0" />
            <path d="M1.42 9a16 16 0 0 1 21.16 0" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <circle cx="12" cy="20" r="1" fill="#7aa2f7" />
        </svg>
    );
}

// ── Components ────────────────────────────────────────────────────────────────
function VolumePopover({ volume, setVolume, onClose }: { volume: number; setVolume: (v: number) => void; onClose: () => void }) {
    return (
        <div
            className="absolute top-9 right-0 z-[100] rounded-xl px-4 py-3 w-52"
            style={{ background: 'rgba(13,14,24,0.97)', border: '1px solid rgba(122,162,247,0.2)', boxShadow: '0 16px 40px rgba(0,0,0,0.6)', backdropFilter: 'blur(16px)' }}
        >
            <p className="font-terminal text-xs mb-2" style={{ color: '#565f89' }}>Volume</p>
            <input
                type="range"
                min={0}
                max={100}
                value={volume}
                onChange={e => setVolume(Number(e.target.value))}
                className="w-full"
                style={{ accentColor: '#7aa2f7', cursor: 'none' }}
            />
            <div className="flex justify-between mt-1">
                <span className="font-terminal text-[10px]" style={{ color: '#3b4261' }}>0</span>
                <span className="font-terminal text-[10px]" style={{ color: '#7aa2f7' }}>{volume}%</span>
                <span className="font-terminal text-[10px]" style={{ color: '#3b4261' }}>100</span>
            </div>
        </div>
    );
}

// ── Main Desktop ───────────────────────────────────────────────────────────────
export function Desktop({ asciiArt }: DesktopProps) {
    useEffect(() => {
        document.documentElement.classList.remove('light', 'dark');
    }, []);
    const [cursor, setCursor] = useState<CursorPos>({ x: -100, y: -100 });
    const [clicking, setClicking] = useState(false);
    const [hovering, setHovering] = useState(false);
    const [time, setTime] = useState('');
    const [showVolume, setShowVolume] = useState(false);

    // Track highest zIndex
    const [topZ, setTopZ] = useState(50);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    const [wins, setWins] = useState<{ terminal: WindowState; about: WindowState }>({
        terminal: { x: 80, y: 60, width: 860, height: 540, minimized: false, maximized: false, open: false, prevGeometry: null, zIndex: 50 },
        about: { x: 200, y: 100, width: 520, height: 480, minimized: false, maximized: false, open: false, prevGeometry: null, zIndex: 51 },
    });

    const [icons, setIcons] = useState<{ terminal: IconState; about: IconState } | null>(null);

    // Initialize icons centered based on screen size on mount
    useEffect(() => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        setIcons({
            terminal: { x: w / 2 - 40, y: h / 2 - 50 },
            about: { x: 36, y: h / 2 - 50 }, // about icon still on left, or we can make it somewhere else
        });
    }, []);

    const networkSpeed = useNetworkSpeed();
    const { volume, setVolume } = useVolume();
    const battery = useBattery();

    // Dragging state
    const draggingObj = useRef<{ type: 'window' | 'icon' | 'resize'; id: 'terminal' | 'about'; offsetX: number; offsetY: number; startW?: number; startH?: number } | null>(null);

    // Clock
    useEffect(() => {
        const tick = () => {
            const now = new Date();
            setTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);

    // Custom cursor tracking & Interactions
    useEffect(() => {
        const updateHover = (e: MouseEvent) => {
            const tgt = e.target as HTMLElement | null;
            if (tgt?.closest('button') || tgt?.closest('.draggable-handle') || tgt?.closest('.resize-handle') || tgt?.closest('a') || draggingObj.current !== null) {
                setHovering(true);
            } else {
                setHovering(false);
            }
        };

        const onMove = (e: MouseEvent) => {
            setCursor({ x: e.clientX, y: e.clientY });
            updateHover(e);

            if (draggingObj.current) {
                const { type, id, offsetX, offsetY, startW, startH } = draggingObj.current;

                if (type === 'window') {
                    setWins(prev => ({
                        ...prev,
                        [id]: {
                            ...prev[id],
                            x: e.clientX - offsetX,
                            y: e.clientY - offsetY,
                        }
                    }));
                } else if (type === 'icon') {
                    setIcons(prev => prev ? ({
                        ...prev,
                        [id]: {
                            x: e.clientX - offsetX,
                            y: e.clientY - offsetY,
                        }
                    }) : null);
                } else if (type === 'resize' && startW !== undefined && startH !== undefined) {
                    setWins(prev => ({
                        ...prev,
                        [id]: {
                            ...prev[id],
                            width: Math.max(300, startW + (e.clientX - offsetX)),
                            height: Math.max(200, startH + (e.clientY - offsetY)),
                        }
                    }));
                }
            }
        };
        const onDown = () => setClicking(true);
        const onUp = () => {
            setClicking(false);
            draggingObj.current = null;
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mousedown', onDown);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mousedown', onDown);
            window.removeEventListener('mouseup', onUp);
        };
    }, []);

    // Close volume popover
    useEffect(() => {
        if (!showVolume) return;
        const handler = () => setShowVolume(false);
        const id = setTimeout(() => window.addEventListener('click', handler), 100);
        return () => { clearTimeout(id); window.removeEventListener('click', handler); };
    }, [showVolume]);

    // Focus Window
    const focusWindow = (id: 'terminal' | 'about') => {
        setTopZ(z => z + 1);
        setWins(w => ({ ...w, [id]: { ...w[id], zIndex: topZ + 1 } }));
    };

    const startDragWindow = (e: React.MouseEvent, id: 'terminal' | 'about') => {
        if (wins[id].maximized) return;
        focusWindow(id);
        draggingObj.current = { type: 'window', id, offsetX: e.clientX - wins[id].x, offsetY: e.clientY - wins[id].y };
        e.preventDefault();
    };

    const startResizeWindow = (e: React.MouseEvent, id: 'terminal' | 'about') => {
        focusWindow(id);
        draggingObj.current = { type: 'resize', id, offsetX: e.clientX, offsetY: e.clientY, startW: wins[id].width, startH: wins[id].height };
        e.preventDefault();
        e.stopPropagation();
    };

    const startDragIcon = (e: React.MouseEvent, id: 'terminal' | 'about') => {
        if (!icons) return;
        draggingObj.current = { type: 'icon', id, offsetX: e.clientX - icons[id].x, offsetY: e.clientY - icons[id].y };
        e.preventDefault();
        e.stopPropagation();
    };

    const toggleWindow = (id: 'terminal' | 'about') => {
        focusWindow(id);
        setWins(w => ({ ...w, [id]: { ...w[id], open: true, minimized: false } }));
    };
    const minimizeWindow = (id: 'terminal' | 'about') => setWins(w => ({ ...w, [id]: { ...w[id], minimized: true } }));
    const closeWindow = (id: 'terminal' | 'about') => setWins(w => ({ ...w, [id]: { ...w[id], open: false, minimized: false, maximized: false } }));
    const restoreWindow = (id: 'terminal' | 'about') => {
        focusWindow(id);
        setWins(w => ({ ...w, [id]: { ...w[id], minimized: false } }));
    };
    const maximizeWindow = (id: 'terminal' | 'about') => {
        focusWindow(id);
        setWins((w) => {
            const self = w[id];
            if (self.maximized) {
                return { ...w, [id]: { ...self, maximized: false, ...(self.prevGeometry ?? {}), prevGeometry: null } };
            }
            return { ...w, [id]: { ...self, maximized: true, prevGeometry: { x: self.x, y: self.y, width: self.width, height: self.height } } };
        });
    };

    const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    // Determine cursor image based on interaction
    const cursorImg = hovering ? '/cursor-pointer.png' : '/cursor-default.png';

    const renderWindow = (
        id: 'terminal' | 'about',
        title: string,
        content: ReactNode
    ) => {
        const win = wins[id];
        if (!win.open || win.minimized) return null;

        if (isMobile) {
            return (
                <div
                    className="absolute inset-x-0 bottom-[56px] top-8 flex flex-col overflow-hidden bg-[#0a0a0a]"
                    style={{ zIndex: win.zIndex }}
                >
                    <div className="flex-1 overflow-hidden">
                        {content}
                    </div>
                </div>
            );
        }

        const windowStyle: React.CSSProperties = win.maximized
            ? { top: 0, left: 0, width: '100vw', height: '100vh' }
            : { top: win.y, left: win.x, width: win.width, height: win.height };

        return (
            <div
                className="absolute flex flex-col overflow-hidden rounded-xl"
                style={{
                    ...windowStyle,
                    zIndex: win.zIndex,
                    background: 'rgba(22, 27, 46, 0.97)',
                    border: '1px solid rgba(122,162,247,0.25)',
                    boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(122,162,247,0.1)',
                    backdropFilter: 'blur(16px)',
                    transition: win.maximized ? 'all 0.25s cubic-bezier(0.4,0,0.2,1)' : 'none',
                }}
                onMouseDown={() => focusWindow(id)}
            >
                {/* Title bar */}
                <div
                    className="draggable-handle flex items-center justify-between px-4 py-[10px] shrink-0"
                    style={{
                        background: 'rgba(10,11,20,0.98)',
                        borderBottom: '1px solid rgba(122,162,247,0.15)',
                        cursor: 'none',
                        userSelect: 'none',
                    }}
                    onMouseDown={(e) => startDragWindow(e, id)}
                    onDoubleClick={() => maximizeWindow(id)}
                >
                    <div className="flex items-center gap-2">
                        <button
                            className="h-3 w-3 rounded-full transition-opacity duration-150 hover:opacity-80"
                            style={{ background: '#f7768e', cursor: 'none', boxShadow: '0 0 0 1px rgba(0,0,0,0.3)' }}
                            onClick={(e) => { e.stopPropagation(); closeWindow(id); }}
                        />
                        <button
                            className="h-3 w-3 rounded-full transition-opacity duration-150 hover:opacity-80"
                            style={{ background: '#e0af68', cursor: 'none', boxShadow: '0 0 0 1px rgba(0,0,0,0.3)' }}
                            onClick={(e) => { e.stopPropagation(); minimizeWindow(id); }}
                        />
                        <button
                            className="h-3 w-3 rounded-full transition-opacity duration-150 hover:opacity-80"
                            style={{ background: '#9ece6a', cursor: 'none', boxShadow: '0 0 0 1px rgba(0,0,0,0.3)' }}
                            onClick={(e) => { e.stopPropagation(); maximizeWindow(id); }}
                        />
                    </div>
                    <span className="font-terminal text-xs tracking-widest pointer-events-none" style={{ color: '#565f89' }}>
                        {title}
                    </span>
                    <div className="w-16" />
                </div>

                {/* Body */}
                <div className="flex-1 overflow-hidden" style={{ cursor: 'none' }}>
                    {content}
                </div>

                {/* Resize handle */}
                {!win.maximized && (
                    <div
                        className="resize-handle absolute bottom-0 right-0 h-4 w-4"
                        style={{
                            cursor: 'none',
                            background: 'linear-gradient(135deg, transparent 50%, rgba(122,162,247,0.4) 50%)',
                            borderRadius: '0 0 12px 0',
                        }}
                        onMouseDown={(e) => startResizeWindow(e, id)}
                    />
                )}
            </div>
        );
    };

    return (
        <div
            className="relative h-screen w-screen overflow-hidden select-none bg-black"
            style={{
                backgroundImage: `url(${isMobile ? '/mobile-wallpaper.png' : '/desktop_wallpaper.jpg'})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                cursor: isMobile ? 'auto' : 'none',
            }}
        >
            {/* Dark overlay for GNOME dark theme */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(5,5,10,0.45)', zIndex: 0 }} />

            {/* Custom cursor  */}
            {!isMobile && (
                <div
                    className="pointer-events-none fixed z-[9999]"
                    style={{
                        left: cursor.x,
                        top: cursor.y,
                        transform: hovering ? `translate(-20%, -10%) scale(${clicking ? 0.9 : 1})` : `translate(-10%, -10%) scale(${clicking ? 0.9 : 1})`,
                        transition: 'transform 0.1s ease',
                        willChange: 'transform',
                    }}
                >
                    <img
                        src={cursorImg}
                        alt=""
                        style={{
                            width: clicking ? 48 : 54,
                            height: clicking ? 48 : 54,
                            objectFit: 'contain',
                            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5)) drop-shadow(0 0 2px rgba(122,162,247,0.3))',
                            transition: 'width 0.1s, height 0.1s',
                        }}
                        draggable={false}
                    />
                </div>
            )}

            {/* Top bar */}
            <div
                className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-5"
                style={{ background: 'rgba(5,5,10,0.82)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', height: 32 }}
            >
                <div className="flex items-center gap-3">
                    <span className="font-terminal text-xs font-bold tracking-widest" style={{ color: '#7aa2f7' }}>bunny㉿portfolio</span>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <WifiIcon />
                        <span className="font-terminal text-[11px] tabular-nums" style={{ color: '#7dcfff' }}>{networkSpeed}</span>
                    </div>
                </div>
            </div>

            {/* Desktop icons */}
            {!isMobile && (
                <motion.button
                    drag
                    dragMomentum={false}
                    className="absolute z-10 flex flex-col items-center gap-1 rounded-lg px-3 py-2 transition-opacity duration-200 group"
                    style={{
                        top: 'calc(50% - 50px)',
                        left: 'calc(50% - 40px)',
                        background: 'transparent',
                        cursor: 'none'
                    }}
                    onClick={() => toggleWindow('terminal')}
                    onPointerDownCapture={(e) => { e.stopPropagation(); }}
                >
                    <div
                        className="flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-200 group-hover:scale-105 group-hover:brightness-125 pointer-events-none"
                        style={{
                            background: 'rgba(13,14,24,0.85)',
                            backdropFilter: 'blur(8px)',
                        }}
                    >
                        <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
                            <rect width="32" height="32" rx="8" fill="#1a1b2e" />
                            <path d="M7 10.5 L14 16 L7 21.5" stroke="#9ece6a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            <line x1="16" y1="22" x2="25" y2="22" stroke="#7aa2f7" strokeWidth="2.5" strokeLinecap="round" />
                        </svg>
                    </div>
                    <span className="font-terminal text-[12px] font-medium tracking-wide mt-1 pointer-events-none" style={{ color: '#c0caf5', textShadow: '0 1px 6px rgba(0,0,0,0.9)' }}>
                        Terminal
                    </span>
                </motion.button>
            )}

            {isMobile && (!wins.terminal.open || wins.terminal.minimized) && (!wins.about.open || wins.about.minimized) && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-2">
                    <button className="flex flex-col items-center gap-2" onClick={() => toggleWindow('terminal')}>
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 border border-white/5 shadow-xl">
                            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                                <rect width="32" height="32" rx="8" fill="#1a1b2e" />
                                <path d="M7 10.5 L14 16 L7 21.5" stroke="#9ece6a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                <line x1="16" y1="22" x2="25" y2="22" stroke="#7aa2f7" strokeWidth="2.5" strokeLinecap="round" />
                            </svg>
                        </div>
                        <span className="text-[10px] font-medium text-white drop-shadow-md">Terminal</span>
                    </button>
                </div>
            )}

            {/* Windows */}
            {renderWindow('terminal', 'bunny㉿portfolio — bash', <CliTerminal asciiArt={asciiArt} />)}

            {renderWindow('about', 'about — portfolio', (
                <div className="h-full w-full overflow-y-auto px-7 py-6 font-terminal text-[#c0caf5]" style={{ background: 'rgba(13,14,24,0.97)', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    <style dangerouslySetInnerHTML={{ __html: '::-webkit-scrollbar { display: none; }' }} />
                    <div className="flex items-center gap-4 mb-6">
                        <div
                            className="flex h-14 w-14 items-center justify-center rounded-xl shrink-0"
                            style={{ background: 'rgba(122,162,247,0.1)', border: '1px solid rgba(122,162,247,0.3)' }}
                        >
                            <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
                                <rect width="32" height="32" rx="8" fill="#1a1b2e" />
                                <path d="M7 10.5 L14 16 L7 21.5" stroke="#9ece6a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                <line x1="16" y1="22" x2="25" y2="22" stroke="#7aa2f7" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold" style={{ color: '#7aa2f7' }}>bunny㉿portfolio</h2>
                            <p className="text-xs mt-0.5" style={{ color: '#565f89' }}>Interactive Terminal Portfolio — v2.0</p>
                        </div>
                    </div>
                    <div className="space-y-2 mb-6 text-xs">
                        <div className="flex items-start gap-3">
                            <span style={{ color: '#9ece6a', minWidth: 80 }}>About:</span>
                            <span style={{ color: '#c0caf5', lineHeight: 1.6 }}>A Linux-inspired desktop built with Next.js, featuring interactive windows, GNOME DE, and Tokyo Night theme.</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span style={{ color: '#9ece6a', minWidth: 80 }}>Owner:</span>
                            <span style={{ color: '#c0caf5' }}>Ayush (bunny)</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span style={{ color: '#9ece6a', minWidth: 80 }}>Stack:</span>
                            <span style={{ color: '#7dcfff' }}>Next.js · TypeScript · Tailwind · Framer Motion</span>
                        </div>
                    </div>
                    <div style={{ borderTop: '1px solid rgba(122,162,247,0.12)', marginBottom: 16 }} />
                    <p className="text-xs mb-3 font-semibold tracking-widest uppercase" style={{ color: '#565f89' }}>Available Commands</p>
                    <div className="space-y-2 text-xs">
                        {[
                            { cmd: 'help', desc: 'List all available commands' },
                            { cmd: 'resume', desc: 'Full resume from resume.md' },
                            { cmd: 'contact', desc: 'Phone, email, website' },
                            { cmd: 'experience', desc: 'Work history (experience 0, 1)' },
                            { cmd: 'education', desc: 'BITS Pilani · CS degree' },
                            { cmd: 'projects', desc: 'ChainGenie, Jagruk, Video-call' },
                            { cmd: 'skills', desc: 'Languages, frameworks, DevOps' },
                            { cmd: 'cat resume.md', desc: 'View resume as markdown' },
                            { cmd: 'openuiportfolio', desc: 'Launch animated UI' },
                        ].map(({ cmd, desc }) => (
                            <div key={cmd} className="flex items-center gap-3">
                                <code className="rounded px-2 py-0.5 text-xs" style={{ background: 'rgba(122,162,247,0.08)', color: '#7aa2f7', minWidth: 140 }}>
                                    {cmd}
                                </code>
                                <span style={{ color: '#565f89' }}>{desc}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {/* Taskbar */}
            <div
                className="absolute bottom-0 left-0 right-0 z-40 flex items-center justify-center gap-3 px-4 py-2"
                style={{ background: 'rgba(5,5,10,0.82)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
                <button
                    className="relative flex flex-col items-center gap-0.5 transition-all duration-200 hover:scale-110"
                    style={{ cursor: 'none' }}
                    onClick={() => wins.terminal.open ? (wins.terminal.minimized ? restoreWindow('terminal') : minimizeWindow('terminal')) : toggleWindow('terminal')}
                >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200" style={{ background: wins.terminal.open ? 'rgba(122,162,247,0.2)' : 'rgba(13,14,24,0.8)', border: wins.terminal.open ? '1px solid rgba(122,162,247,0.5)' : '1px solid rgba(122,162,247,0.2)', boxShadow: wins.terminal.open ? '0 0 12px rgba(122,162,247,0.25)' : 'none' }}>
                        <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
                            <path d="M7 10.5 L14 16 L7 21.5" stroke="#9ece6a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                            <line x1="16" y1="22" x2="25" y2="22" stroke="#7aa2f7" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </div>
                    {wins.terminal.open && <div className="h-1 w-1 rounded-full" style={{ background: '#7aa2f7', boxShadow: '0 0 4px rgba(122,162,247,0.8)' }} />}
                </button>

                <button
                    className="relative flex flex-col items-center gap-0.5 transition-all duration-200 hover:scale-110"
                    style={{ cursor: 'none' }}
                    onClick={() => wins.about.open ? (wins.about.minimized ? restoreWindow('about') : minimizeWindow('about')) : toggleWindow('about')}
                >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200" style={{ background: wins.about.open ? 'rgba(187,154,247,0.2)' : 'rgba(13,14,24,0.8)', border: wins.about.open ? '1px solid rgba(187,154,247,0.5)' : '1px solid rgba(187,154,247,0.2)', boxShadow: wins.about.open ? '0 0 12px rgba(187,154,247,0.25)' : 'none' }}>
                        <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
                            <circle cx="16" cy="16" r="10" stroke="#bb9af7" strokeWidth="1.8" />
                            <line x1="16" y1="13" x2="16" y2="21" stroke="#bb9af7" strokeWidth="2.2" strokeLinecap="round" />
                            <circle cx="16" cy="10" r="1.4" fill="#bb9af7" />
                        </svg>
                    </div>
                    {wins.about.open && <div className="h-1 w-1 rounded-full" style={{ background: '#bb9af7', boxShadow: '0 0 4px rgba(187,154,247,0.8)' }} />}
                </button>
            </div>
        </div>
    );
}
