'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface LoadingScreenProps {
    onComplete: () => void;
}

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
    const [progress, setProgress] = useState(0);
    const [isFinished, setIsFinished] = useState(false);

    useEffect(() => {
        let currentProgress = 0;
        const interval = setInterval(() => {
            // Non-linear, slightly glitchy fast progression
            const increment = Math.random() > 0.4 ? Math.floor(Math.random() * 8) : Math.floor(Math.random() * 2);
            currentProgress += increment;
            if (currentProgress >= 100) {
                currentProgress = 100;
                setProgress(currentProgress);
                clearInterval(interval);
                setTimeout(() => {
                    setIsFinished(true);
                    setTimeout(onComplete, 900); // Wait for the exit animation
                }, 400); // Small pause at 100%
            } else {
                setProgress(currentProgress);
            }
        }, 35);

        return () => clearInterval(interval);
    }, [onComplete]);

    return (
        <AnimatePresence>
            {!isFinished && (
                <motion.div
                    className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0e0e0e] overflow-hidden"
                    initial={{ y: 0 }}
                    exit={{ y: '-100vh' }}
                    transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
                >
                    <div className="relative flex select-none">
                        {/* Base Text */}
                        <h1
                            className="text-[12vw] leading-none text-[#414141] uppercase m-0 p-0 font-bold"
                            style={{ letterSpacing: '-0.05em', fontFamily: 'system-ui, -apple-system, sans-serif' }}
                        >
                            AYUSH
                        </h1>

                        {/* Overlay Text for Fill Animation with Clip Path */}
                        <div
                            className="absolute top-0 left-0 w-full h-full text-white overflow-hidden pointer-events-none"
                            style={{ clipPath: `inset(${100 - progress}% 0 0 0)` }}
                        >
                            <h1
                                className="text-[12vw] leading-none uppercase m-0 p-0 font-bold"
                                style={{ letterSpacing: '-0.05em', fontFamily: 'system-ui, -apple-system, sans-serif' }}
                            >
                                AYUSH
                            </h1>
                        </div>

                        {/* Percentage Indicator */}
                        <div className="absolute right-0 -bottom-6 md:-bottom-8 font-mono text-xs md:text-sm tracking-widest text-[#ffffff]">
                            [ {progress}% ]
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
