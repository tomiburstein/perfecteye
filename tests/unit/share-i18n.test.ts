import { describe, expect, it } from 'vitest';
import { createI18n, detectLang, translate } from '../../src/i18n';
import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';
import { buildShareText, shareLinks } from '../../src/games/classic/share';
import { generateDailyChallenge } from '../../src/games/classic/generator';

describe('share text', () => {
  it('matches the expected format', () => {
    const text = buildShareText(createI18n('en'), 42, [94, 88, 96, 91, 85], 'https://perfecteye.example');
    expect(text).toBe(
      [
        'PERFECTEYE #042',
        '🎯 Center: 94/100',
        '📏 Half: 88/100',
        '📐 Angle: 96/100',
        '📍 Distance: 91/100',
        '🔺 Shape: 85/100',
        'TOTAL: 454/500',
        'Can you beat my score?',
        'https://perfecteye.example',
      ].join('\n'),
    );
  });

  it('is translated to Spanish', () => {
    const text = buildShareText(createI18n('es'), 7, [1, 2, 3, 4, 5], 'https://x.y');
    expect(text).toContain('PERFECTEYE #007');
    expect(text).toContain('🎯 Centro: 1/100');
    expect(text).toContain('¿Puedes superarme?');
  });

  it('never reveals the solution', () => {
    const c = generateDailyChallenge('2026-11-12');
    const text = buildShareText(createI18n('en'), c.number, [50, 50, 50, 50, 50], '');
    for (const v of [c.center.center.x, c.center.radius, c.angle.targetDeg, c.half.start.x]) {
      expect(text).not.toContain(String(v));
    }
  });

  it('builds encoded share links', () => {
    const links = shareLinks('hi there\n#1', 'https://a.b');
    expect(links.whatsapp).toBe('https://wa.me/?text=hi%20there%0A%231');
    expect(links.x.startsWith('https://twitter.com/intent/tweet?text=')).toBe(true);
  });
});

describe('i18n', () => {
  it('has the same keys in every language, all non-empty', () => {
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
    for (const v of [...Object.values(en), ...Object.values(es)]) expect(v.trim().length).toBeGreaterThan(0);
  });

  it('uses the same placeholders in every language', () => {
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(ph(es[key]), key).toBe(ph(en[key]));
    }
  });

  it('detects the browser language', () => {
    expect(detectLang(['es-AR', 'en'])).toBe('es');
    expect(detectLang(['fr-FR', 'es'])).toBe('es');
    expect(detectLang(['de'])).toBe('en');
    expect(detectLang([])).toBe('en');
  });

  it('interpolates parameters', () => {
    expect(translate('en', 'home.challenge', { n: 5 })).toBe('Daily challenge #5');
    expect(translate('es', 'home.challenge', { n: 5 })).toBe('Desafío diario #5');
  });

  it('formats numbers per locale', () => {
    expect(createI18n('es').num(3.25, 1)).toMatch(/^3,[23]$/);
    expect(createI18n('en').num(3.25, 1)).toMatch(/^3\.[23]$/);
  });
});
