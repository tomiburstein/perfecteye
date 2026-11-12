# Fórmulas de puntuación / Scoring formulas

Código: `src/games/classic/scoring.ts` · Pruebas: `tests/unit/scoring.test.ts`

## Fórmula general

```
exceso  = max(0, error − tolerancia)
puntaje = redondear( 100 × 2^( −(exceso / mitad)^1.5 ) )
```

- **error ≤ tolerancia → 100.** La tolerancia absorbe la imprecisión normal de un dedo o un mouse.
- **error = tolerancia + mitad → 50 puntos.**
- Para errores grandes, el puntaje baja de forma suave hasta 0.
- La función es pura y determinista (sin azar). Además nunca sube cuando el error crece, así que una respuesta más precisa nunca obtiene menos puntos que otra menos precisa.
- Siempre es un número entero entre 0 y 100. Si el error es inválido (NaN, negativo o infinito), da 0.

## Cómo se mide el error en cada prueba

Todo se mide en **unidades del tablero** (el tablero mide 1000×1000 sin importar la pantalla) y además se expresa en forma **relativa**. Por eso el puntaje no depende de la resolución.

| Prueba | Error | Tolerancia | "Mitad" (50 pts) |
|---|---|---|---|
| 🎯 Find the Center | distancia al centro ÷ radio del círculo | 1 % | +10 % |
| 📏 Perfect Half | \|posición − 0,5\| como fracción del largo de la línea | 0,5 % | +5 % |
| 📐 Angle Master | diferencia angular en grados (circular, 0–180) | 1° | +12° |
| 📍 Equal Distance | \|BC − AB\| ÷ AB | 1 % | +10 % |
| 🔺 Perfect Shape | distancia media entre vértices ÷ tamaño del tablero, usando la mejor correspondencia entre vértices (se prueban las 6 posibles) | 0,8 % | +7 % |

## Valores de referencia (verificados por las pruebas automáticas)

| Prueba | Error → Puntos |
|---|---|
| Center | 2 % → 98 · 3 % → 94 · 5 % → 84 · 10 % → 55 · 20 % → 16 |
| Half | 1 % → 98 · 2 % → 89 · 3 % → 78 · 5 % → 55 · 10 % → 16 |
| Angle | 2° → 98 · 3° → 95 · 5° → 88 · 10° → 64 · 15° → 42 · 20° → 25 · 30° → 7 |
| Distance | 2 % → 98 · 5 % → 84 · 10 % → 55 · 20 % → 16 |
| Shape | 2 % → 95 · 4 % → 81 · 6 % → 64 · 10 % → 35 · 15 % → 13 |

## Cómo ajustar la dificultad

Se editan los valores de `SCORE_CURVES` en `scoring.ts`. Las pruebas avisan si cambian los valores de referencia; en ese caso hay que actualizar esta tabla y la prueba "matches documented reference values".
Ojo: cambiar las curvas modifica el puntaje de las partidas en curso, porque esos puntajes se recalculan a partir de las respuestas guardadas. Las partidas ya terminadas no cambian, porque su puntaje quedó guardado.

> El puntaje es un juego. No es una medida científica de la capacidad visual.
