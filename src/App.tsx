import { useCallback, useEffect, useState } from 'react';
import { ArrowUpRight, Check, Gift as GiftIcon, Heart, LockKeyhole, RefreshCw, Sparkles, X } from 'lucide-react';
import { gifts, type Gift } from './config/gifts';
import { changeReservation, fetchStatuses, reserveGift, subscribeStatuses, type GiftStatus } from './lib/reservations';
import { supabaseConfigured } from './lib/supabase';

const TOKEN_PREFIX = 'gift-reservation-token:';

function App() {
  const [statuses, setStatuses] = useState<Record<string, GiftStatus>>({});
  const [selected, setSelected] = useState<Gift | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (!supabaseConfigured) return;
    setRefreshing(true);
    try {
      const rows = await fetchStatuses();
      setStatuses(Object.fromEntries(rows.map((row) => [row.gift_id, row])));
      setError('');
    } catch {
      setError('Не удалось обновить статусы. Проверьте соединение.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const unsubscribe = subscribeStatuses(() => { void refresh(); });
    const timer = window.setInterval(() => { void refresh(); }, 30000);
    window.addEventListener('online', refresh);
    return () => {
      unsubscribe();
      window.clearInterval(timer);
      window.removeEventListener('online', refresh);
    };
  }, [refresh]);

  const statusOf = (giftId: string) => statuses[giftId]?.status ?? 'available';

  async function bookGift() {
    if (!selected) return;
    const cleanName = name.trim();
    if (cleanName.length < 2 || cleanName.length > 40) {
      setError('Укажите имя длиной от 2 до 40 символов.');
      return;
    }
    if (!supabaseConfigured) {
      setError('Бронирование ещё не подключено. Для общей работы нужна настройка Supabase.');
      return;
    }
    setBusy(true); setError('');
    try {
      const result = await reserveGift(selected.id, cleanName);
      localStorage.setItem(`${TOKEN_PREFIX}${selected.id}`, result.token);
      setNotice(`Подарок «${selected.name}» забронирован. Код восстановления сохранён в этом браузере.`);
      setSelected(null); setName('');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось забронировать подарок.');
      await refresh();
    } finally { setBusy(false); }
  }

  async function manageGift(action: 'cancel_gift' | 'mark_purchased', gift: Gift) {
    const token = localStorage.getItem(`${TOKEN_PREFIX}${gift.id}`);
    if (!token) {
      setError('В этом браузере не найден код вашей брони.');
      return;
    }
    setBusy(true); setError('');
    try {
      await changeReservation(action, gift.id, token);
      if (action === 'cancel_gift') localStorage.removeItem(`${TOKEN_PREFIX}${gift.id}`);
      setNotice(action === 'cancel_gift' ? 'Бронь отменена.' : 'Подарок отмечен как купленный.');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Операция не выполнена.');
    } finally { setBusy(false); }
  }

  return (
    <main className="page-shell">
      <div className="photo-overlay" />
      <header className="topbar">
        <div className="brand-mark"><GiftIcon size={22} /></div>
        <span>НАШ СПИСОК ЖЕЛАНИЙ</span>
        <span className="topbar-heart"><Heart size={18} fill="currentColor" /></span>
      </header>

      <section className="hero">
        <div className="eyebrow"><Sparkles size={15} /> МАЛЕНЬКИЕ РАДОСТИ</div>
        <h1>Подарки с <em>любовью</em></h1>
        <div className="hero-pill"><span className="pulse-dot" /> {gifts.filter(g => statusOf(g.id) === 'available').length} подарков ждут своих друзей</div>
      </section>

      <section className="gift-section" aria-label="Список подарков">
        <div className="section-heading">
          <div><span className="section-kicker">ВЫБЕРИТЕ ПОДАРОК</span><h2>Коробка сюрпризов <span>✳</span></h2></div>
          <span className="gift-count">{gifts.length} подарков</span>
        </div>
        <div className="gift-grid">
          {gifts.map((gift, index) => {
            const status = statusOf(gift.id);
            const row = statuses[gift.id];
            return (
              <article className={`gift-card ${gift.accent}`} key={gift.id} style={{ animationDelay: `${index * 80}ms` }}>
                <button className="gift-art-button" onClick={() => { setSelected(gift); setError(''); }} aria-label={`Подробнее: ${gift.name}`}>
                  <span className="card-number">0{index + 1}</span>
                  <span className="art-glow" />
                  <img className="gift-art" src={gift.image} alt="" />
                  <span className={`status-chip ${status}`}>
                    {status === 'available' ? <><Sparkles size={12} /> Свободен</> : status === 'reserved' ? <><LockKeyhole size={12} /> Забронирован</> : <><Check size={12} /> Куплен</>}
                  </span>
                </button>
                <div className="card-copy">
                  <h3>{gift.name}</h3>
                  <p>{gift.description}</p>
                  {status !== 'available' && row?.reserved_by && <div className="reserved-by">Выбрал(а): <strong>{row.reserved_by}</strong></div>}
                  <div className="card-actions">
                    <button className="details-button" onClick={() => { setSelected(gift); setError(''); }}>Подробнее</button>
                    <a className="buy-button" href={gift.url} target="_blank" rel="noopener noreferrer" aria-label={`Открыть ${gift.name} на Wildberries`}><ArrowUpRight size={17} /></a>
                  </div>
                  {status === 'reserved' && <div className="owner-actions">
                    <button onClick={() => void manageGift('cancel_gift', gift)} disabled={busy}>Отменить мою бронь</button>
                    <button onClick={() => void manageGift('mark_purchased', gift)} disabled={busy}>Уже купил(а)</button>
                  </div>}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <footer className="footer">
        <div className="footer-star">✳</div>
        <p>Самое ценное — внимание. Спасибо, что вы рядом!</p>
        <span>СОЗДАНО С ЛЮБОВЬЮ</span>
      </footer>

      {!supabaseConfigured && <div className="setup-banner"><span className="setup-dot" /> Демо-режим: общий список бронирований ещё не подключён.</div>}
      {error && <div className="toast error" role="alert"><span>{error}</span><button onClick={() => setError('')} aria-label="Закрыть"><X size={16} /></button></div>}
      {notice && <div className="toast success" role="status"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Закрыть"><X size={16} /></button></div>}
      {supabaseConfigured && <button className="refresh-button" onClick={() => void refresh()} aria-label="Обновить статусы" title="Обновить статусы"><RefreshCw size={16} className={refreshing ? 'spin' : ''} /></button>}

      {selected && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
        <section className="details-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <button className="modal-close" onClick={() => setSelected(null)} aria-label="Закрыть"><X size={19} /></button>
          <div className={`modal-art ${selected.accent}`}><img src={selected.image} alt="" /></div>
          <div className="modal-content">
            <span className="section-kicker">МАЛЕНЬКИЙ СЮРПРИЗ</span>
            <h2 id="modal-title">{selected.name}</h2>
            <p>{selected.description}</p>
            <div className={`modal-status ${statusOf(selected.id)}`}>
              {statusOf(selected.id) === 'available' ? 'Подарок свободен' : statusOf(selected.id) === 'reserved' ? `Забронирован${statuses[selected.id]?.reserved_by ? `: ${statuses[selected.id].reserved_by}` : ''}` : 'Подарок уже куплен'}
            </div>
            {statusOf(selected.id) === 'available' && <>
              <label htmlFor="friend-name">Ваше имя</label>
              <input id="friend-name" value={name} onChange={e => setName(e.target.value)} maxLength={40} placeholder="Как вас подписать?" />
              <button className="reserve-button" onClick={() => void bookGift()} disabled={busy}>{busy ? 'Сохраняем…' : 'Забронировать подарок'}</button>
            </>}
            <a className="modal-buy" href={selected.url} target="_blank" rel="noopener noreferrer">Перейти к покупке на Wildberries <ArrowUpRight size={17} /></a>
            <small>Бронь помогает друзьям не выбрать один и тот же подарок. Заказ оформляется самостоятельно на Wildberries.</small>
          </div>
        </section>
      </div>}
    </main>
  );
}

export default App;