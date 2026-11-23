// Token Radar dashboard: a sortable, filterable board, a detail view per protocol,
// a live-token view and the model's own workings. Static page, no network: it reads
// window.RADAR from data.js and nothing else. State lives in the URL hash, so the
// board, a detail view and a filtered view each have an address.
//
// The farm plan is generated here from the row's own record (category, chains, TVL,
// age) with the same rules as lib/model.ts, so the page's steps are the board's steps.

(function () {
  'use strict';
  var DATA = window.RADAR;
  // The watchlist is the floor: rows flagged by the build carry it in data.js.
  var WATCHLIST = {};
  (DATA.watchlist || []).forEach(function (s) { WATCHLIST[s] = true; });

  var state = { tab: 'board', q: '', cat: 'all', chain: 'all', minTvl: 0, watch: false, sel: null, sort: 'implied_value_usd', dir: -1 };

  function fmtUsd(n) {
    if (n === null || n === undefined) return '—';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + Math.round(n);
  }
  function fmtPct(n) {
    if (n === null || n === undefined) return '—';
    return (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
  }
  function fmtAge(days) {
    if (days === null || days === undefined) return '—';
    if (days < 365) return days + 'd';
    return (days / 365).toFixed(1) + 'y';
  }
  function fmtMult(n) { return n.toFixed(2) + 'x'; }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined) return;
        if (k === 'text') node.textContent = v;
        else if (k === 'class') node.className = v;
        else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v);
      });
    }
    if (children !== undefined && children !== null) {
      if (!Array.isArray(children)) children = [children];
      children.forEach(function (c) {
        if (c === null || c === undefined) return;
        node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
    }
    return node;
  }

  /* ---- farm plan: the same rules as lib/model.ts, from the row's own record ---- */
  function chainOf(r) { return r.chains && r.chains.length > 0 ? r.chains[0] : 'its main chain'; }
  function capitalFor(r) {
    if (r.tvl_usd >= 5e9) return 300;
    if (r.tvl_usd >= 1e9) return 200;
    if (r.tvl_usd >= 1e8) return 100;
    return 50;
  }
  function holdDaysFor(age) {
    if (age === null || age === undefined) return 30;
    if (age < 180) return 60;
    if (age < 365) return 45;
    return 30;
  }
  function actionFor(r, capital, chain) {
    var c = (r.category || '').toLowerCase();
    var name = r.name;
    if (c.indexOf('lend') >= 0 || c.indexOf('cdp') >= 0 || c.indexOf('collateral') >= 0)
      return 'Lend $' + capital + ' of USDC on ' + name + ' (' + chain + ') and leave the loan open.';
    if (c.indexOf('dex') >= 0 || c.indexOf('yield') >= 0 || c.indexOf('leveraged farm') >= 0 || c.indexOf('liquidity manager') >= 0)
      return 'Add $' + capital + ' of liquidity to ' + name + '\'s deepest pool on ' + chain + ' and leave it in.';
    if (c.indexOf('bridge') >= 0)
      return 'Bridge $' + capital + ' of USDC to ' + chain + ' with ' + name + ', then use the bridged funds inside its app.';
    if (c.indexOf('staking') >= 0 || c.indexOf('restak') >= 0)
      return 'Stake $' + capital + ' of the chain\'s native asset through ' + name + ' and keep the receipt token.';
    if (c.indexOf('perpetual') >= 0 || c.indexOf('derivative') >= 0 || c.indexOf('options') >= 0)
      return 'Post $' + capital + ' of USDC as margin on ' + name + ' and open a single small hedged trade.';
    if (c.indexOf('prediction') >= 0)
      return 'Fund your account with $' + capital + ' and take one position in a ' + name + ' market.';
    if (c.indexOf('curator') >= 0 || c.indexOf('allocator') >= 0 || c.indexOf('vault') >= 0)
      return 'Put $' + capital + ' into a ' + name + ' vault on ' + chain + ' and hold the vault shares.';
    if (c.indexOf('stable') >= 0)
      return 'Mint or hold $' + capital + ' of the stable asset issued through ' + name + ' on ' + chain + '.';
    if (c.indexOf('rwa') >= 0)
      return 'Mint $' + capital + ' of ' + name + '\'s yield-bearing asset on ' + chain + ' and hold it.';
    if (c.indexOf('insurance') >= 0)
      return 'Buy $' + capital + ' of cover from ' + name + ' on ' + chain + ' and keep the policy active.';
    if (c.indexOf('payment') >= 0)
      return 'Route $' + capital + ' of payments through ' + name + ' on ' + chain + ' and keep the receipts.';
    if (c.indexOf('chain') >= 0)
      return 'Use $' + capital + ' of activity on the ' + name + ' chain: one swap, one deposit and one vote.';
    return 'Deposit $' + capital + ' of USDC into ' + name + ' on ' + chain + ' and leave the position open.';
  }
  function farmSteps(r) {
    var chain = chainOf(r);
    var capital = capitalFor(r);
    var hold = holdDaysFor(r.age_days);
    var gas = capital >= 200 ? 8 : 4;
    return [
      { text: 'Start a fresh wallet that holds only the funds you plan to farm, and store its seed phrase offline.', cost: 'under $3 of gas for the first transaction', time: '5 minutes' },
      { text: actionFor(r, capital, chain), cost: '$' + capital + ' of capital and about $' + gas + ' of gas', time: '15 minutes to set up' },
      { text: 'Do one qualifying action each week, such as a deposit, a borrow, a swap or a vote.', cost: 'about $2 of gas a week', time: '10 minutes a week' },
      { text: 'Keep the position open for at least ' + hold + ' days so your activity lands in more than one snapshot.', cost: 'the $' + capital + ' stays in the position', time: hold + ' days' },
      { text: 'Before you withdraw, open the protocol\'s own points or rewards page and claim only from the link it publishes.', cost: 'no fee to check, and never pay to claim', time: '10 minutes' },
      { text: 'Log the wallet, the dates and every transaction in a farm log, so you can repeat the position or unwind it.', cost: 'nothing but the log', time: '5 minutes' }
    ].map(function (s) {
      var t = s.text + ' Cost: ' + s.cost + '. Time: ' + s.time + '.';
      if (t.length > 600) t = t.slice(0, 596) + '...';
      return { text: s.text, cost: s.cost, time: s.time, full: t };
    });
  }

  /* ---- hash state ---- */
  function readHash() {
    var h = window.location.hash.replace(/^#/, '');
    var p = new URLSearchParams(h);
    state.tab = p.get('tab') || 'board';
    state.q = p.get('q') || '';
    state.cat = p.get('cat') || 'all';
    state.chain = p.get('chain') || 'all';
    state.minTvl = parseFloat(p.get('min') || '0') || 0;
    state.watch = p.get('watch') === '1';
    state.sel = p.get('sel') || null;
    state.sort = p.get('sort') || 'implied_value_usd';
    state.dir = p.get('dir') === '1' ? 1 : -1;
  }
  function writeHash() {
    var p = new URLSearchParams();
    if (state.tab !== 'board') p.set('tab', state.tab);
    if (state.q) p.set('q', state.q);
    if (state.cat !== 'all') p.set('cat', state.cat);
    if (state.chain !== 'all') p.set('chain', state.chain);
    if (state.minTvl) p.set('min', String(state.minTvl));
    if (state.watch) p.set('watch', '1');
    if (state.sel) p.set('sel', state.sel);
    if (state.sort !== 'implied_value_usd') p.set('sort', state.sort);
    if (state.dir === 1) p.set('dir', '1');
    var s = p.toString();
    history.replaceState(null, '', s ? '#' + s : '#');
  }

  /* ---- filtering and sorting ---- */
  function filteredRows() {
    var q = state.q.trim().toLowerCase();
    return DATA.rows.filter(function (r) {
      if (state.watch && !WATCHLIST[r.slug]) return false;
      if (state.cat !== 'all' && (r.category || 'Other') !== state.cat) return false;
      if (state.chain !== 'all' && r.chains.indexOf(state.chain) < 0) return false;
      if (r.tvl_usd < state.minTvl) return false;
      if (q && (r.name + ' ' + r.slug + ' ' + (r.category || '')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }
  function sortedRows(list) {
    var key = state.sort;
    var dir = state.dir;
    return list.slice().sort(function (a, b) {
      var av = a[key], bv = b[key];
      if (av === null || av === undefined) av = -Infinity;
      if (bv === null || bv === undefined) bv = -Infinity;
      if (typeof av === 'string') return dir * (av < bv ? -1 : av > bv ? 1 : 0);
      if (av !== bv) return dir * (av - bv);
      return a.slug < b.slug ? -1 : 1;
    });
  }

  /* ---- views ---- */
  function header() {
    var top = DATA.rows[0];
    return el('header', { class: 'top' }, [
      el('p', { class: 'eyebrow', text: 'Token Radar · model ' + DATA.model_version + ' · snapshot ' + DATA.as_of }),
      el('h1', {}, ['Pre-token protocols, ', el('span', { class: 'gold', text: 'ranked by what a launch would be worth' })]),
      el('p', { class: 'lede' }, [
        'Every protocol DefiLlama tracks that ', el('b', { text: 'records no token' }),
        ' — ', el('b', { text: String(DATA.board_size) }), ' of them — scored from the snapshot\'s own figures: TVL, seven-day growth, how long it has run with no token, and what live protocols in its category trade at per dollar of TVL. Click a row for the model\'s working and the steps to farm it.'
      ]),
      el('div', { class: 'stats' }, [
        el('div', { class: 'stat' }, [el('div', { class: 'n', text: String(DATA.board_size) }), el('div', { class: 'l', text: 'protocols ranked' })]),
        el('div', { class: 'stat' }, [el('div', { class: 'n', text: String(DATA.watchlist_size) }), el('div', { class: 'l', text: 'on the watchlist' })]),
        el('div', { class: 'stat' }, [el('div', { class: 'n', text: fmtUsd(top ? top.implied_value_usd : 0) }), el('div', { class: 'l', text: 'top implied value' })]),
        el('div', { class: 'stat' }, [el('div', { class: 'n', text: fmtMult(DATA.global_multiple) }), el('div', { class: 'l', text: 'global FDV/TVL multiple' })]),
        el('div', { class: 'stat' }, [el('div', { class: 'n', text: String(DATA.live_size) }), el('div', { class: 'l', text: 'live tokens for reference' })])
      ])
    ]);
  }

  function tabs() {
    function tab(name, label) {
      return el('button', {
        type: 'button', class: 'tab', 'aria-pressed': state.tab === name ? 'true' : 'false', text: label,
        onclick: function () { state.tab = name; state.sel = null; writeHash(); render(); }
      });
    }
    return el('div', { class: 'tabs' }, [tab('board', 'Board'), tab('live', 'Live token'), tab('model', 'Model')]);
  }

  function controls() {
    var cats = Array.from(new Set(DATA.rows.map(function (r) { return r.category || 'Other'; }))).sort();
    var chains = Array.from(new Set(DATA.rows.reduce(function (a, r) { return a.concat(r.chains); }, []))).sort();
    var search = el('input', { type: 'search', placeholder: 'Search a protocol…', value: state.q, 'aria-label': 'Search protocols' });
    search.addEventListener('input', function () { state.q = search.value; writeHash(); render(); });
    var catSel = el('select', { 'aria-label': 'Filter by category' },
      [el('option', { value: 'all', text: 'All categories' })].concat(cats.map(function (c) {
        return el('option', { value: c, text: c, selected: c === state.cat ? 'selected' : null });
      })));
    catSel.addEventListener('change', function () { state.cat = catSel.value; writeHash(); render(); });
    var chainSel = el('select', { 'aria-label': 'Filter by chain' },
      [el('option', { value: 'all', text: 'All chains' })].concat(chains.map(function (c) {
        return el('option', { value: c, text: c, selected: c === state.chain ? 'selected' : null });
      })));
    chainSel.addEventListener('change', function () { state.chain = chainSel.value; writeHash(); render(); });
    var tvlSel = el('select', { 'aria-label': 'Minimum TVL' }, [
      el('option', { value: '0', text: 'Any TVL', selected: state.minTvl === 0 ? 'selected' : null }),
      el('option', { value: '100000000', text: 'TVL ≥ $100M', selected: state.minTvl === 1e8 ? 'selected' : null }),
      el('option', { value: '500000000', text: 'TVL ≥ $500M', selected: state.minTvl === 5e8 ? 'selected' : null }),
      el('option', { value: '1000000000', text: 'TVL ≥ $1B', selected: state.minTvl === 1e9 ? 'selected' : null })
    ]);
    tvlSel.addEventListener('change', function () { state.minTvl = parseFloat(tvlSel.value) || 0; writeHash(); render(); });
    var watch = el('label', { class: 'check' }, [
      el('input', {
        type: 'checkbox', checked: state.watch ? 'checked' : null,
        onchange: function (e) { state.watch = e.target.checked; writeHash(); render(); }
      }),
      'Watchlist only'
    ]);
    var n = filteredRows().length;
    return el('div', { class: 'controls' }, [search, catSel, chainSel, tvlSel, watch,
      el('span', { class: 'count', text: n + ' of ' + DATA.board_size + ' protocols' })]);
  }

  function sortHeader(key, label, numeric) {
    var arrow = state.sort === key ? (state.dir < 0 ? ' ↓' : ' ↑') : '';
    return el('th', { class: numeric ? 'num' : null }, [
      el('button', {
        type: 'button', class: 'sortbtn', text: label + arrow,
        onclick: function () {
          if (state.sort === key) state.dir = -state.dir;
          else { state.sort = key; state.dir = key === 'name' ? 1 : -1; }
          writeHash(); render();
        }
      })
    ]);
  }

  function boardTable() {
    var list = sortedRows(filteredRows());
    var maxImplied = DATA.rows.length ? DATA.rows[0].implied_value_usd : 1;
    if (list.length === 0) {
      return el('div', { class: 'empty' }, [
        el('h2', { text: 'No protocol matches that filter' }),
        el('p', { text: 'Loosen the search or clear a filter.' }),
        el('button', {
          class: 'button primary', type: 'button', text: 'Clear filters',
          onclick: function () { state.q = ''; state.cat = 'all'; state.chain = 'all'; state.minTvl = 0; state.watch = false; writeHash(); render(); }
        })
      ]);
    }
    var head = el('thead', {}, [el('tr', {}, [
      sortHeader('rank', 'Rank', true),
      sortHeader('name', 'Protocol'),
      sortHeader('tvl_usd', 'TVL', true),
      sortHeader('change_7d', '7d', true),
      sortHeader('age_days', 'Age', true),
      sortHeader('implied_value_usd', 'Implied value', true),
      sortHeader('multiple', 'Multiple', true)
    ])]);
    var body = el('tbody', {}, list.map(function (r) {
      var pct = r.change_7d;
      var pctCls = pct === null ? '' : pct >= 0 ? 'up' : 'down';
      var width = Math.max(2, Math.round(100 * r.implied_value_usd / maxImplied));
      return el('tr', {
        class: state.sel === r.slug ? 'selected' : null,
        onclick: function () { state.sel = state.sel === r.slug ? null : r.slug; writeHash(); render(); }
      }, [
        el('td', { class: 'rank', text: '#' + r.rank }),
        el('td', {}, [
          el('div', { class: 'name' }, [
            r.name,
            WATCHLIST[r.slug] ? el('span', { class: 'badge watch', text: 'Watchlist' }) : null
          ]),
          el('div', { class: 'sub', text: (r.category || 'Other') + ' · ' + (r.chains.slice(0, 3).join(', ') || '—') })
        ]),
        el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }),
        el('td', { class: 'num ' + pctCls, text: fmtPct(pct) }),
        el('td', { class: 'num', text: fmtAge(r.age_days) }),
        el('td', { class: 'num' }, [
          el('div', { text: fmtUsd(r.implied_value_usd) }),
          el('div', { class: 'bar' }, [el('i', { style: 'width:' + width + '%' })])
        ]),
        el('td', { class: 'num', text: fmtMult(r.multiple) })
      ]);
    }));
    return el('div', { class: 'tablewrap' }, [el('table', {}, [head, body])]);
  }

  function detailView() {
    if (!state.sel) return null;
    var r = null;
    DATA.rows.forEach(function (x) { if (x.slug === state.sel) r = x; });
    if (!r) return null;
    var base = r.tvl_usd * r.multiple;
    var steps = farmSteps(r);
    var chainText = r.chains.length > 4
      ? r.chains.slice(0, 4).join(', ') + ' + ' + (r.chains.length - 4) + ' more'
      : (r.chains.join(', ') || '—');
    return el('section', { class: 'detail', 'aria-label': 'Protocol detail' }, [
      el('div', { class: 'head' }, [
        el('span', { class: 'rankchip', text: 'Rank #' + r.rank }),
        el('h2', { text: r.name }),
        WATCHLIST[r.slug] ? el('span', { class: 'badge watch', text: 'Watchlist' }) : null,
        el('button', {
          class: 'button close', type: 'button', text: 'Close',
          onclick: function () { state.sel = null; writeHash(); render(); }
        })
      ]),
      el('p', { class: 'meta' }, [
        (r.category || 'Other') + ' · ' + chainText + ' · TVL ',
        el('b', { text: fmtUsd(r.tvl_usd) }), ' · 7d ',
        el('b', { class: r.change_7d !== null && r.change_7d >= 0 ? 'up' : 'down', text: fmtPct(r.change_7d) }),
        ' · listed ' + (r.listed_at || 'unknown') + ' (' + fmtAge(r.age_days) + ' ago) · ',
        el('b', { text: 'records no token' })
      ]),
      el('h3', { text: 'How the implied value is built' }),
      el('table', { class: 'modeltable' }, [el('tbody', {}, [
        el('tr', {}, [el('td', { text: 'TVL × category multiple (' + fmtMult(r.multiple) + ')' }), el('td', { text: fmtUsd(base) })]),
        el('tr', {}, [el('td', { text: 'Growth multiplier (7d ' + fmtPct(r.change_7d) + ')' }), el('td', { text: '× ' + r.growth_multiplier.toFixed(2) })]),
        el('tr', {}, [el('td', { text: 'Maturity multiplier (' + fmtAge(r.age_days) + ' with no token)' }), el('td', { text: '× ' + r.maturity_multiplier.toFixed(2) })]),
        el('tr', {}, [el('td', { text: 'Chain breadth multiplier (' + r.chains.length + ' chains)' }), el('td', { text: '× ' + r.chain_multiplier.toFixed(2) })]),
        el('tr', { class: 'total' }, [el('td', { text: 'Implied value' }), el('td', { text: fmtUsd(r.implied_value_usd) })])
      ])]),
      el('h3', { text: 'How to farm it — six steps' }),
      el('ol', { class: 'steps' }, steps.map(function (s) {
        return el('li', {}, [
          el('div', { text: s.text }),
          el('div', { class: 'cost' }, ['Cost: ', el('b', { text: s.cost }), ' · Time: ', el('b', { text: s.time })])
        ]);
      }))
    ]);
  }

  function liveView() {
    var head = el('thead', {}, [el('tr', {}, [
      el('th', { text: 'Protocol' }),
      el('th', { class: 'num', text: 'Market cap' }),
      el('th', { class: 'num', text: 'TVL' }),
      el('th', { class: 'num', text: 'FDV / TVL' }),
      el('th', { class: 'num', text: '7d' })
    ])]);
    var body = el('tbody', {}, DATA.live.map(function (p) {
      var ratio = p.mcap_usd && p.tvl_usd ? p.mcap_usd / p.tvl_usd : null;
      var pct = p.change_7d;
      return el('tr', {}, [
        el('td', {}, [
          el('div', { class: 'name', text: p.name }),
          el('div', { class: 'sub', text: (p.category || 'Other') + ' · ' + (p.chains.slice(0, 3).join(', ') || '—') })
        ]),
        el('td', { class: 'num', text: fmtUsd(p.mcap_usd) }),
        el('td', { class: 'num', text: fmtUsd(p.tvl_usd) }),
        el('td', { class: 'num', text: ratio === null ? '—' : fmtMult(ratio) }),
        el('td', { class: 'num ' + (pct === null ? '' : pct >= 0 ? 'up' : 'down'), text: fmtPct(pct) })
      ]);
    }));
    return el('div', {}, [
      el('p', { class: 'lede', text: 'These protocols already trade. Their market caps are the market\'s own values — and the source of the board\'s category multiples. They are never ranked against the pre-token board.' }),
      el('div', { class: 'tablewrap' }, [el('table', {}, [head, body])])
    ]);
  }

  function modelView() {
    var multRows = Object.keys(DATA.multiples).sort().map(function (c) {
      return el('tr', {}, [el('td', { text: c }), el('td', { text: fmtMult(DATA.multiples[c]) })]);
    });
    multRows.push(el('tr', {}, [el('td', { text: 'Global median (fallback)' }), el('td', { text: fmtMult(DATA.global_multiple) })]));
    return el('div', { class: 'modelgrid' }, [
      el('div', { class: 'card' }, [
        el('h2', { text: 'The model — radar-2' }),
        el('p', {}, ['The implied value is what a protocol\'s token ', el('b', { text: 'would be worth' }), ' if it launched one day, assuming its record stays as it is. It does not predict whether or when a token is issued.']),
        el('div', { class: 'formula', text:
          'multiple(cat) = median(mcap / TVL) of live\n' +
          '  protocols in the category (n >= 3),\n' +
          '  else the global median; clamped [0.05, 1.50]\n' +
          'base          = TVL x multiple(cat)\n' +
          'growth        = clamp(7d change, -50, +100)%\n' +
          'growthMult    = 1 + growth x 0.5\n' +
          'maturityMult  = 0.70 + min(age, 1095)/1095 x 0.30\n' +
          'chainMult     = 1 + 0.02 x min(chains, 5)\n' +
          'implied       = base x growthMult\n' +
          '                x maturityMult x chainMult' }),
        el('h3', { text: 'Why each term' }),
        el('p', {}, [el('b', { text: 'Category multiple. ' }), 'The market pays a different price per dollar of TVL for a lending protocol than for a DEX. The multiple is read off this snapshot\'s own live rows, so the model follows from the snapshot, not from one flat number.']),
        el('p', {}, [el('b', { text: 'Growth. ' }), 'A TVL that is still compounding is worth more than the same size shrinking. Clamped hard: one row reports +4,448% in a week.']),
        el('p', {}, [el('b', { text: 'Maturity. ' }), 'A protocol that has run longer with no token has a larger, more proven user base, so a launch would be worth more — capped so age never dominates size.']),
        el('p', {}, [el('b', { text: 'Chain breadth. ' }), 'More chains means more users reached, worth at most +10%.'])
      ]),
      el('div', { class: 'card' }, [
        el('h2', { text: 'Category multiples from this snapshot' }),
        el('p', { text: 'Median market-cap-per-TVL of live protocols in each category. Categories with fewer than 3 live protocols fall back to the global median.' }),
        el('table', { class: 'multtable' }, [el('tbody', {}, multRows)]),
        el('h3', { text: 'Reading the board honestly' }),
        el('p', {}, ['A protocol ', el('b', { text: 'records no token' }), ' when its DefiLlama record carries none. That is not proof it has none: a protocol on this board may still hold a token its record does not carry.']),
        el('p', {}, ['The watchlist is a floor, never a ceiling: it holds 40 of the snapshot\'s 758 protocols, and this board ranks ', el('b', { text: String(DATA.board_size) }), ' pre-token protocols, including ', el('b', { text: String(DATA.early_size) }), ' below the watchlist floor.']),
        el('p', {}, ['Implied values are this entry\'s own claims, never make.fun\'s.'])
      ])
    ]);
  }

  function footer() {
    return el('footer', {}, [
      el('p', { text: 'Snapshot: ' + DATA.source + ' · as of ' + DATA.as_of + ' · floor $' + (DATA.floor_usd / 1e6) + 'M · ' + DATA.board_size + ' pre-token protocols ranked.' }),
      el('p', { text: 'Implied values are this entry\'s own claims. Nothing here is investment advice, and nothing predicts whether or when any protocol issues a token.' })
    ]);
  }

  function render() {
    var app = document.getElementById('app');
    app.setAttribute('aria-busy', 'false');
    app.textContent = '';
    var wrap = el('div', { class: 'wrap' });
    wrap.appendChild(header());
    wrap.appendChild(tabs());
    if (state.tab === 'live') wrap.appendChild(liveView());
    else if (state.tab === 'model') wrap.appendChild(modelView());
    else {
      wrap.appendChild(controls());
      var d = detailView();
      if (d) wrap.appendChild(d);
      wrap.appendChild(boardTable());
    }
    wrap.appendChild(footer());
    app.appendChild(wrap);
  }

  readHash();
  window.addEventListener('hashchange', function () { readHash(); render(); });
  render();
})();
