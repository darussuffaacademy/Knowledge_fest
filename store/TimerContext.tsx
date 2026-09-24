
import React, { createContext, useState, useEffect, useRef, useContext, ReactNode } from 'react';
import { Item } from '../types';

// --- Audio Utility ---
class AudioEngine {
    private ctx: AudioContext | null = null;
    private mainBus: GainNode | null = null;

    private getContext() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            
            // 1. Create Main Bus & Compressor (Limit peaks while allowing high volume)
            this.mainBus = this.ctx.createGain();
            this.mainBus.gain.value = 0.8; // High Master Volume

            const compressor = this.ctx.createDynamicsCompressor();
            compressor.threshold.value = -10;
            compressor.ratio.value = 12;
            compressor.attack.value = 0.003;
            compressor.release.value = 0.25;

            // 2. Create Resonance/Delay Loop (Simulates Hall Reverb)
            const delay = this.ctx.createDelay();
            delay.delayTime.value = 0.25; // 250ms echo

            const feedback = this.ctx.createGain();
            feedback.gain.value = 0.3; // 30% feedback

            const delayFilter = this.ctx.createBiquadFilter();
            delayFilter.type = 'lowpass';
            delayFilter.frequency.value = 1500; // Dampen high freq on echoes

            // 3. Wiring
            this.mainBus.connect(compressor);
            
            // Wet Chain
            this.mainBus.connect(delay);
            delay.connect(delayFilter);
            delayFilter.connect(feedback);
            feedback.connect(delay); // Loop
            feedback.connect(compressor); // Mix to output

            compressor.connect(this.ctx.destination);
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        return { ctx: this.ctx, output: this.mainBus! };
    }

    private playOscillator(freq: number, type: OscillatorType, duration: number, startTime: number, vol: number) {
        try {
            const { ctx, output } = this.getContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
            
            // ADSR Envelope
            gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
            gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + startTime + 0.005); // Instant Attack (5ms)
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration); // Exponential Decay

            osc.connect(gain);
            gain.connect(output);

            osc.start(ctx.currentTime + startTime);
            osc.stop(ctx.currentTime + startTime + duration);
        } catch (e) {
            console.error(e);
        }
    }

    // Helper to play a single resonant bell hit
    private scheduleBellHit(startTimeOffset: number) {
        const base = 1568; // G6
        // Long resonant tail
        this.playOscillator(base, 'sine', 2.5, startTimeOffset, 0.9);
        // Harmonic overtone
        this.playOscillator(base * 2.1, 'triangle', 0.4, startTimeOffset, 0.15); 
        // Sub-harmonic for body
        this.playOscillator(base * 0.5, 'sine', 1.5, startTimeOffset, 0.1); 
    }

    playBellSequence(count: number) {
        const gap = 0.6; // Seconds between bells
        for (let i = 0; i < count; i++) {
            this.scheduleBellHit(i * gap);
        }
    }

    playOvertimeAlarm() {
        // Loud, jarring alarm using Sawtooth/Square waves
        this.playOscillator(150, 'sawtooth', 0.8, 0, 0.7);
        this.playOscillator(200, 'square', 0.8, 0, 0.5);
        this.playOscillator(150, 'sawtooth', 0.8, 0.4, 0.7);
        this.playOscillator(200, 'square', 0.8, 0.4, 0.5);
    }
}

const audioEngine = new AudioEngine();

interface TimerContextType {
    activeItem: Item | null;
    timeLeft: number;
    initialDuration: number;
    isRunning: boolean;
    isMuted: boolean;
    startTimer: (item: Item) => void;
    togglePause: () => void;
    resetTimer: () => void;
    clearTimer: () => void;
    toggleMute: () => void;
    triggerManualBell: (count: number) => void;
}

export const TimerContext = createContext<TimerContextType | null>(null);

export const TimerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [activeItem, setActiveItem] = useState<Item | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [initialDuration, setInitialDuration] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const timerRef = useRef<number | null>(null);
    const wakeLockRef = useRef<any>(null);

    // Timer Tick
    useEffect(() => {
        if (isRunning) {
            timerRef.current = window.setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isRunning]);

    // Wake Lock
    useEffect(() => {
        let isCancelled = false;
        const requestWakeLock = async () => {
            if ('wakeLock' in navigator && isRunning) {
                try {
                    const lock = await (navigator as any).wakeLock.request('screen');
                    if (isCancelled) {
                        lock?.release?.().catch(() => {});
                    } else {
                        wakeLockRef.current = lock;
                    }
                } catch {
                    // Disallowed by permissions policy in embedded iframes - fail silently
                    wakeLockRef.current = null;
                }
            } else {
                if (wakeLockRef.current) {
                    wakeLockRef.current.release?.().catch(() => {});
                    wakeLockRef.current = null;
                }
            }
        };
        requestWakeLock();
        return () => {
            isCancelled = true;
            if (wakeLockRef.current) {
                wakeLockRef.current.release?.().catch(() => {});
                wakeLockRef.current = null;
            }
        };
    }, [isRunning]);

    // Bell Logic
    useEffect(() => {
        if (isMuted || !isRunning || !activeItem) return;

        // Warning Bell: 1 minute remaining (60 seconds) -> 1 Bell
        if (timeLeft === 60) {
            audioEngine.playBellSequence(1);
            if (navigator.vibrate) navigator.vibrate(200);
        }
        // Final Bell: 0 seconds -> 2 Bells
        else if (timeLeft === 0) {
            audioEngine.playBellSequence(2);
            if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
        }
        // Overtime Bell: 1 minute past ( -60 seconds) -> Alarm
        else if (timeLeft === -60) {
            audioEngine.playOvertimeAlarm();
            if (navigator.vibrate) navigator.vibrate(1000);
        }
    }, [timeLeft, isMuted, isRunning, activeItem]);

    const startTimer = (item: Item) => {
        setActiveItem(item);
        const durationInSeconds = (item.duration || 5) * 60;
        setInitialDuration(durationInSeconds);
        setTimeLeft(durationInSeconds);
        setIsRunning(false); 
    };

    const togglePause = () => setIsRunning(prev => !prev);
    
    const resetTimer = () => {
        setIsRunning(false);
        setTimeLeft(initialDuration);
    };

    const clearTimer = () => {
        setIsRunning(false);
        setActiveItem(null);
        setTimeLeft(0);
    };

    const toggleMute = () => setIsMuted(prev => !prev);

    const triggerManualBell = (count: number) => {
        audioEngine.playBellSequence(count);
    };

    return (
        <TimerContext.Provider value={{
            activeItem, timeLeft, initialDuration, isRunning, isMuted,
            startTimer, togglePause, resetTimer, clearTimer, toggleMute, triggerManualBell
        }}>
            {children}
        </TimerContext.Provider>
    );
};

export const useTimer = () => {
    const context = useContext(TimerContext);
    if (!context) throw new Error('useTimer must be used within TimerProvider');
    return context;
};
