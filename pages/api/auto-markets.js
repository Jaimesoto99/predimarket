// pages/api/auto-markets.js
// Generación automática de mercados diarios
// Fuentes: Yahoo Finance · CoinGecko · Open-Meteo · preciodelaluz.org
// Invocación: POST /api/auto-markets  con header x-admin-key: predi-admin-2026
// También se puede configurar como cron job en vercel.json

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // service role para escritura sin RLS
);

const ADMIN_KEY = process.env.ADMIN_KEY || 'predi-admin-2026';

// ─── Helpers ────────────────────────────────────────────────────────────────

function todayUTC() {
  return new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
}

function endOfDayUTC() {
  const d = new Date();
  d.setUTCHours(22, 0, 0, 0); // cierre a las 22:00 UTC (medianoche Madrid)
  // Si ya pasaron las 22h, poner mañana
  if (Date.now() > d.getTime()) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d.toISOString();
}

/** Redondea a un número "bonito" para el umbral del mercado */
function niceThreshold(value, direction = 'above') {
  // Devuelve un valor redondeado cercano al precio actual
  if (value > 10000) return Math.round(value / 100) * 100;
  if (value > 1000)  return Math.round(value / 10) * 10;
  if (value > 100)   return Math.round(value / 5) * 5;
  if (value > 10)    return Math.round(value * 2) / 2;
  return Math.round(value * 100) / 100;
}

/** Precio inicial AMM equilibrado (50/50) */
function initialPrices() {
  return { yes_price: 0.50, no_price: 0.50 };
}

// ─── Fuentes de datos ────────────────────────────────────────────────────────

async function fetchYahooFinance(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta) throw new Error('Yahoo: sin datos en meta');
    return {
      price: meta.regularMarketPrice ?? meta.previousClose,
      currency: meta.currency,
      symbol,
    };
  } catch (err) {
    console.error(`[auto-markets] Yahoo Finance (${symbol}):`, err.message);
    return null;
  }
}

async function fetchCoinGecko(ids = 'bitcoin,ethereum') {
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,eur`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('[auto-markets] CoinGecko:', err.message);
    return null;
  }
}

async function fetchOpenMeteo() {
  try {
    // Madrid: lat 40.4168, lon -3.7038
    const url =
      'https://api.open-meteo.com/v1/forecast?latitude=40.4168&longitude=-3.7038' +
      '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum' +
      '&forecast_days=1&timezone=Europe%2FMadrid';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
    const json = await res.json();
    return {
      tempMax: json?.daily?.temperature_2m_max?.[0],
      tempMin: json?.daily?.temperature_2m_min?.[0],
      precipitation: json?.daily?.precipitation_sum?.[0],
    };
  } catch (err) {
    console.error('[auto-markets] Open-Meteo:', err.message);
    return null;
  }
}

async function fetchPrecioDeLaLuz() {
  try {
    // API pública de preciodelaluz.org
    const url = 'https://api.preciodelaluz.org/v1/prices/now?zone=PCB';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`PrecioDeLaLuz HTTP ${res.status}`);
    const json = await res.json();
    // Precio en €/MWh
    const precioMWh = json?.price ?? json?.['precio-hora'];
    return typeof precioMWh === 'number' ? precioMWh : null;
  } catch (err) {
    console.error('[auto-markets] PrecioDeLaLuz:', err.message);
    // Fallback: media de hoy con ESIOS (REE) si falla preciodelaluz
    try {
      const today = todayUTC();
      const esios = await fetch(
        `https://api.preciodelaluz.org/v1/prices/avg?zone=PCB&date=${today}`
      );
      if (esios.ok) {
        const d = await esios.json();
        return d?.price ?? null;
      }
    } catch (_) {}
    return null;
  }
}

// ─── Constructores de mercados ────────────────────────────────────────────────

function buildMarketsFromData({ ibex, eurusd, btc, eth, meteo, luz }) {
  const today = todayUTC();
  const resolutionDate = endOfDayUTC();
  const markets = [];

  // ── IBEX 35 ──────────────────────────────────────────────────────────────
  if (ibex?.price) {
    const threshold = niceThreshold(ibex.price);
    markets.push({
      external_id: `ibex35-above-${threshold}-${today}`,
      title:`¿Cerrará el IBEX 35 por encima de ${threshold.toLocaleString('es-ES')} puntos hoy?`,
      description:
        `El IBEX 35 cotiza actualmente en torno a ${ibex.price.toLocaleString('es-ES')} puntos. ` +
        `Este mercado se resolverá SÍ si el precio de cierre oficial supera los ${threshold.toLocaleString('es-ES')} puntos al finalizar la sesión bursátil de hoy.`,
      category: 'ECONOMIA',
      resolution_source: 'Yahoo Finance (^IBEX)',
      close_date: resolutionDate,
      threshold,
      direction: 'above',
      ...initialPrices(),
    });
  }

  // ── EUR/USD ───────────────────────────────────────────────────────────────
  if (eurusd?.price) {
    const threshold = niceThreshold(eurusd.price);
    markets.push({
      external_id: `eurusd-above-${threshold}-${today}`,
      title:`¿Cerrará el EUR/USD por encima de ${threshold} hoy?`,
      description:
        `El par EUR/USD cotiza actualmente en ${eurusd.price.toFixed(4)}. ` +
        `Este mercado se resolverá SÍ si el tipo de cambio de cierre supera ${threshold}.`,
      category: 'ECONOMIA',
      resolution_source: 'Yahoo Finance (EURUSD=X)',
      close_date: resolutionDate,
      threshold,
      direction: 'above',
      ...initialPrices(),
    });
  }

  // ── Bitcoin ───────────────────────────────────────────────────────────────
  if (btc) {
    const price = btc.usd;
    const threshold = niceThreshold(price);
    markets.push({
      external_id: `btc-above-${threshold}-${today}`,
      title:`¿Cerrará Bitcoin por encima de $${threshold.toLocaleString('en-US')} hoy?`,
      description:
        `Bitcoin cotiza actualmente en torno a $${price.toLocaleString('en-US')}. ` +
        `Este mercado se resolverá SÍ si el precio de cierre (00:00 UTC) supera los $${threshold.toLocaleString('en-US')}.`,
      category: 'CRIPTO',
      resolution_source: 'CoinGecko (bitcoin)',
      close_date: resolutionDate,
      threshold,
      direction: 'above',
      ...initialPrices(),
    });
  }

  // ── Ethereum ──────────────────────────────────────────────────────────────
  if (eth) {
    const price = eth.usd;
    const threshold = niceThreshold(price);
    markets.push({
      external_id: `eth-above-${threshold}-${today}`,
      title:`¿Cerrará Ethereum por encima de $${threshold.toLocaleString('en-US')} hoy?`,
      description:
        `Ethereum cotiza actualmente en torno a $${price.toLocaleString('en-US')}. ` +
        `Este mercado se resolverá SÍ si el precio de cierre (00:00 UTC) supera los $${threshold.toLocaleString('en-US')}.`,
      category: 'CRIPTO',
      resolution_source: 'CoinGecko (ethereum)',
      close_date: resolutionDate,
      threshold,
      direction: 'above',
      ...initialPrices(),
    });
  }

  // ── Temperatura máxima Madrid ─────────────────────────────────────────────
  if (meteo?.tempMax != null) {
    const threshold = niceThreshold(meteo.tempMax);
    markets.push({
      external_id: `madrid-tempmax-above-${threshold}-${today}`,
      title:`¿Superará la temperatura máxima en Madrid los ${threshold}°C hoy?`,
      description:
        `La previsión de temperatura máxima para Madrid hoy es de ${meteo.tempMax}°C. ` +
        `Este mercado se resolverá SÍ si la temperatura máxima registrada supera los ${threshold}°C según Open-Meteo.`,
      category: 'CLIMA',
      resolution_source: 'Open-Meteo (Madrid)',
      close_date: resolutionDate,
      threshold,
      direction: 'above',
      ...initialPrices(),
    });
  }

  // ── Lluvia en Madrid ──────────────────────────────────────────────────────
  if (meteo?.precipitation != null) {
    const willRain = meteo.precipitation > 0;
    markets.push({
      external_id: `madrid-rain-${today}`,
      title:`¿Lloverá en Madrid hoy?`,
      description:
        `La previsión de precipitación para Madrid hoy es de ${meteo.precipitation} mm. ` +
        `Este mercado se resolverá SÍ si la precipitación acumulada supera 0 mm según Open-Meteo.`,
      category: 'CLIMA',
      resolution_source: 'Open-Meteo (Madrid)',
      close_date: resolutionDate,
      threshold: 0,
      direction: 'above',
      // Precio inicial sesgado por la previsión
      yes_price: willRain ? 0.65 : 0.30,
      no_price: willRain ? 0.35 : 0.70,
    });
  }

  // ── Precio de la luz ──────────────────────────────────────────────────────
  if (luz != null) {
    const threshold = niceThreshold(luz);
    markets.push({
      external_id: `luz-above-${threshold}-${today}`,
      title:`¿Superará el precio medio de la luz los ${threshold} €/MWh hoy?`,
      description:
        `El precio actual de la electricidad en España es de ${luz.toFixed(2)} €/MWh. ` +
        `Este mercado se resolverá SÍ si el precio medio diario del mercado mayorista (PVPC) supera los ${threshold} €/MWh.`,
      category: 'ENERGIA',
      resolution_source: 'preciodelaluz.org / REE',
      close_date: resolutionDate,
      threshold,
      direction: 'above',
      ...initialPrices(),
    });
  }

  return markets;
}

// ─── Inserción en Supabase ────────────────────────────────────────────────────

/** Convierte precio AMM (0-1) a pools iniciales con total = 10000 */
function priceToPool(yesPrice) {
  const total = 10000;
  return {
    yes_pool: (1 - yesPrice) * total,
    no_pool:  yesPrice        * total,
  };
}

async function upsertMarkets(markets) {
  const results = { created: [], skipped: [], errors: [] };
  const today   = todayUTC();

  for (const market of markets) {
    try {
      // Idempotencia: comprobar si ya existe un mercado con el mismo título hoy
      const { data: existing } = await supabase
        .from('markets')
        .select('id')
        .eq('title', market.title)
        .gte('close_date', today)
        .maybeSingle();

      if (existing) {
        results.skipped.push(market.title);
        continue;
      }

      const { yes_pool, no_pool } = priceToPool(market.yes_price);

      const { data, error } = await supabase
        .from('markets')
        .insert({
          title:             market.title,
          description:       market.description,
          category:          market.category,
          market_type:       'DIARIO',
          resolution_source: market.resolution_source,
          close_date:        market.close_date,
          yes_pool,
          no_pool,
          status:            'ACTIVE',
        })
        .select('id')
        .single();

      if (error) {
        results.errors.push({ id: market.title, error: error.message });
      } else {
        results.created.push({ id: data.id, title: market.title });
      }
    } catch (err) {
      results.errors.push({ id: market.title, error: err.message });
    }
  }

  return results;
}

// ─── Handler principal ────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // Solo POST (o GET para facilitar cron jobs de Vercel)
  if (!['POST', 'GET'].includes(req.method)) {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // Autenticación por admin key
  const key = req.headers['x-admin-key'] || req.query.key;
  if (key !== ADMIN_KEY) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  console.log('[auto-markets] Iniciando generación de mercados diarios...');

  // ── Fetch paralelo de todas las fuentes ──────────────────────────────────
  const [ibex, eurusd, cryptoPrices, meteo, luz] = await Promise.all([
    fetchYahooFinance('^IBEX'),
    fetchYahooFinance('EURUSD=X'),
    fetchCoinGecko('bitcoin,ethereum'),
    fetchOpenMeteo(),
    fetchPrecioDeLaLuz(),
  ]);

  const btc = cryptoPrices?.bitcoin ?? null;
  const eth = cryptoPrices?.ethereum ?? null;

  const dataSnapshot = {
    ibex:   ibex   ? { price: ibex.price }   : null,
    eurusd: eurusd ? { price: eurusd.price } : null,
    btc:    btc    ? { usd: btc.usd, eur: btc.eur } : null,
    eth:    eth    ? { usd: eth.usd, eur: eth.eur } : null,
    meteo,
    luz,
  };

  console.log('[auto-markets] Snapshot de datos:', JSON.stringify(dataSnapshot, null, 2));

  // ── Construir mercados ────────────────────────────────────────────────────
  const markets = buildMarketsFromData({
    ibex,
    eurusd,
    btc,
    eth,
    meteo,
    luz,
  });

  if (markets.length === 0) {
    return res.status(200).json({
      ok: false,
      message: 'No se pudieron generar mercados: todas las fuentes fallaron.',
      dataSnapshot,
    });
  }

  // ── Insertar en Supabase ──────────────────────────────────────────────────
  const results = await upsertMarkets(markets);

  console.log('[auto-markets] Resultado:', results);

  return res.status(200).json({
    ok: true,
    date: todayUTC(),
    dataSnapshot,
    markets: {
      total:   markets.length,
      created: results.created.length,
      skipped: results.skipped.length,
      errors:  results.errors.length,
    },
    details: results,
  });
}