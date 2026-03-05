import React, { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';

export function NodeMindButton({ onClick }: { onClick: () => void }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let width = 40;
        let height = 40;

        // Using a high pixel ratio for smooth rendering
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.scale(dpr, dpr);

        const numBubbles = 4;

        // Resolve CSS variables into canvas-friendly strings
        const getColor = (variable: string, fallback: string) => {
            const val = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
            return val ? `hsl(${val})` : fallback;
        };

        const primaryColor = getColor('--primary', 'hsl(263 70% 58%)');

        // Ensure a very bright accent color
        const getBrightAccent = () => {
            const raw = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
            // Fallback to a bright fuchsia accent if unable to parse hsl properly
            return raw ? `hsl(${raw})` : '#ff00ff';
        };
        const brightAccentColor = getBrightAccent();

        class Bubble {
            x: number;
            y: number;
            vx: number;
            vy: number;
            radius: number;
            color: string;
            mass: number;

            constructor() {
                // Double the bubble size: 3.0 to 7.0 instead of 1.5 to 3.5
                this.radius = Math.random() * 4 + 3.0;
                this.x = Math.random() * (width - this.radius * 2) + this.radius;
                this.y = Math.random() * (height - this.radius * 2) + this.radius;
                // Slow initial velocity
                this.vx = (Math.random() - 0.5) * 0.4;
                this.vy = (Math.random() - 0.5) * 0.4;
                this.mass = this.radius;

                // Bright node accent color always
                this.color = brightAccentColor;
            }

            draw(ctx: CanvasRenderingContext2D) {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = this.color;

                // Add a subtle glow to bubbles
                ctx.shadowBlur = 4;
                ctx.shadowColor = this.color;

                ctx.fill();
                ctx.shadowBlur = 0; // reset
                ctx.closePath();
            }

            update(bubbles: Bubble[]) {
                // Apply velocity
                this.x += this.vx;
                this.y += this.vy;

                // Bouncing off walls
                if (this.x - this.radius <= 0) {
                    this.x = this.radius;
                    this.vx *= -1;
                } else if (this.x + this.radius >= width) {
                    this.x = width - this.radius;
                    this.vx *= -1;
                }

                if (this.y - this.radius <= 0) {
                    this.y = this.radius;
                    this.vy *= -1;
                } else if (this.y + this.radius >= height) {
                    this.y = height - this.radius;
                    this.vy *= -1;
                }

                // Check collision with other bubbles
                for (let i = 0; i < bubbles.length; i++) {
                    const other = bubbles[i];
                    if (this === other) continue;

                    const dx = other.x - this.x;
                    const dy = other.y - this.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const minDistance = this.radius + other.radius;

                    if (distance < minDistance) {
                        // Collision detected - resolve overlap directly so they don't stick
                        const overlap = minDistance - distance;
                        const nx = dx / distance;
                        const ny = dy / distance;

                        // Nudge them apart
                        this.x -= nx * overlap * 0.5;
                        this.y -= ny * overlap * 0.5;
                        other.x += nx * overlap * 0.5;
                        other.y += ny * overlap * 0.5;

                        // Elastic collision velocities mapping to 2D
                        const kx = (this.vx - other.vx);
                        const ky = (this.vy - other.vy);

                        // Vector dot product
                        const p = 2 * (nx * kx + ny * ky) / (this.mass + other.mass);

                        this.vx = this.vx - p * this.mass * nx;
                        this.vy = this.vy - p * this.mass * ny;
                        other.vx = other.vx + p * other.mass * nx;
                        other.vy = other.vy + p * other.mass * ny;
                    }
                }
            }
        }

        const bubbles: Bubble[] = [];
        for (let i = 0; i < numBubbles; i++) {
            bubbles.push(new Bubble());
        }

        // Interactive mouse state (simulate avoiding the center)
        // Optional extension: we can link this to bounds

        const render = () => {
            ctx.clearRect(0, 0, width, height);

            // Update first then draw to prevent overlap tearing
            for (const bubble of bubbles) {
                bubble.update(bubbles);
            }
            for (const bubble of bubbles) {
                bubble.draw(ctx);
            }

            animationFrameId = window.requestAnimationFrame(render);
        };
        render();

        return () => {
            window.cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <button
            onClick={onClick}
            className="node-mind-physics-btn group"
            title="Node Mind"
        >
            {/* Background Canvas for Physics bubbles */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 z-0 pointer-events-none"
            />

            {/* Glass Overlay + Content */}
            <div className="node-mind-physics-btn-inner">
                <span className="font-mono text-[14px] font-medium text-foreground dark:text-[#E0E0E0] tracking-tight">
                    N<span className="animate-pulse">*</span>
                </span>
            </div>
        </button>
    );
}
