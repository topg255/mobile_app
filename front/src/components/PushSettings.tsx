import React, { useCallback, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  Bell,
  BellOff,
  BellRing,
  Smartphone,
  Monitor,
  Send,
  Trash2,
  ShieldAlert,
  Zap,
  Clock,
  Inbox,
} from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { NotificationPreferences } from '../types';
import './PushSettings.css';

const PREF_LABELS: { key: keyof NotificationPreferences; label: string; desc: string }[] = [
  { key: 'criticalAlerts', label: 'Alertes critiques', desc: 'Incidents rouges, arrets production' },
  { key: 'systemNotifications', label: 'Notifications systeme', desc: 'Nouveaux agents, approbations' },
  { key: 'aiReports', label: 'Rapports IA', desc: 'Rapports quotidiens et risques detectes' },
  { key: 'objectives', label: 'Objectifs qualite', desc: 'Risque, atteinte ou echec d\'objectif' },
  { key: 'messages', label: 'Messages', desc: 'Nouveaux messages du chat' },
  { key: 'benchmarkAlerts', label: 'Benchmark', desc: 'Evolution du classement conformite' },
  { key: 'capaAlerts', label: 'CAPA', desc: 'Actions correctives generees' },
];

const STATUS_LABEL: Record<string, string> = {
  sent: 'Envoyee',
  delivered: 'Delivree',
  opened: 'Ouverte',
  clicked: 'Cliquee',
  dismissed: 'Ignoree',
  failed: 'Echec',
};

const PRIORITY_LABEL: Record<string, string> = {
  critical: 'Critique',
  high: 'Haute',
  medium: 'Moyenne',
  low: 'Basse',
};

const PushSettings: React.FC<{ isSuperAdmin?: boolean }> = ({ isSuperAdmin }) => {
  const push = usePushNotifications();
  const [historyPage, setHistoryPage] = useState(1);

  const handleToggle = useCallback(
    async (key: keyof NotificationPreferences, value: boolean) => {
      try {
        await push.updatePreferences({ [key]: value } as Partial<NotificationPreferences>);
        toast.success('Preferences mises a jour');
      } catch {
        toast.error('Erreur lors de la mise a jour');
      }
    },
    [push],
  );

  const handleEnable = useCallback(async () => {
    const result = await push.register();
    if (result.message === 'Notifications activees') {
      toast.success('Notifications activees');
    } else {
      toast(result.message, { icon: '🔕' });
    }
  }, [push]);

  const handleDisable = useCallback(async () => {
    await push.unregister();
    toast.success('Notifications desactivees');
  }, [push]);

  const handleSendTest = useCallback(async () => {
    const msg = await push.sendTest();
    toast(msg || 'Notification de test envoyee', { icon: '🔔' });
  }, [push]);

  const handleRunEscalation = useCallback(async () => {
    const res = await push.runEscalation();
    toast.success(`${res.escalated} escalation(s) traitee(s)`);
  }, [push]);

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-';

  return (
    <div className="ps-container">
      <div className="ps-header">
        <div className="ps-header-icon"><BellRing size={22} /></div>
        <div>
          <h3 className="ps-title">Notifications Push</h3>
          <p className="ps-subtitle">Alertes smart en temps reel sur incident, rapport IA, objectifs et messages</p>
        </div>
      </div>

      {/* Activation */}
      <div className={`ps-activation ${push.enabled ? 'ps-enabled' : ''}`}>
        <div className="ps-act-left">
          <div className={`ps-status-dot ${push.enabled ? 'on' : 'off'}`} />
          <div>
            <span className="ps-act-title">
              {push.enabled ? 'Notifications actives' : 'Notifications desactivees'}
            </span>
            <span className="ps-act-desc">
              {!push.supported
                ? 'Navigateur non pris en charge (Chrome, Edge, Firefox recommandes)'
                : push.permission === 'granted'
                  ? 'Vous recevrez les alertes meme lorsque lapplication est fermee'
                  : 'Autorisez les notifications pour recevoir les alertes en temps reel'}
            </span>
          </div>
        </div>
        <div className="ps-act-btns">
          {push.enabled ? (
            <>
              <button className="ps-btn ps-btn-test" onClick={handleSendTest} disabled={push.testSending}>
                <Send size={15} /> {push.testSending ? 'Envoi...' : 'Envoyer un test'}
              </button>
              <button className="ps-btn ps-btn-danger" onClick={handleDisable} disabled={push.loading}>
                <BellOff size={15} /> Desactiver
              </button>
            </>
          ) : (
            <button className="ps-btn ps-btn-primary" onClick={handleEnable} disabled={push.loading || !push.supported}>
              <Bell size={15} /> {push.loading ? 'Activation...' : 'Activer les notifications'}
            </button>
          )}
        </div>
      </div>

      {/* Preferences */}
      <div className="ps-grid">
        <div className="ps-card">
          <div className="ps-card-head">
            <Bell size={16} />
            <span>Categories d'alerte</span>
          </div>
          <div className="ps-pref-list">
            {PREF_LABELS.map(({ key, label, desc }) => (
              <label key={key} className="ps-pref-row">
                <div>
                  <span className="ps-pref-label">{label}</span>
                  <span className="ps-pref-desc">{desc}</span>
                </div>
                <input
                  type="checkbox"
                  className="ps-switch"
                  checked={push.preferences ? Boolean(push.preferences[key]) : true}
                  onChange={(e) => handleToggle(key, e.target.checked)}
                  disabled={!push.preferences}
                />
              </label>
            ))}
            <label className="ps-pref-row">
              <div>
                <span className="ps-pref-label">Ne pas deranger</span>
                <span className="ps-pref-desc">Silence total sur la periode definie</span>
              </div>
              <input
                type="checkbox"
                className="ps-switch"
                checked={push.preferences?.dndEnabled ?? false}
                onChange={(e) => handleToggle('dndEnabled', e.target.checked)}
                disabled={!push.preferences}
              />
            </label>
            {push.preferences?.dndEnabled && (
              <div className="ps-dnd-times">
                <label>
                  Debut
                  <select
                    value={push.preferences.dndStart}
                    onChange={(e) => handleToggle('dndStart', e.target.value as never)}
                  >
                    {Array.from({ length: 48 }, (_, i) => {
                      const h = String(Math.floor(i / 2)).padStart(2, '0');
                      const m = i % 2 === 0 ? '00' : '30';
                      return <option key={i} value={`${h}:${m}`}>{`${h}:${m}`}</option>;
                    })}
                  </select>
                </label>
                <label>
                  Fin
                  <select
                    value={push.preferences.dndEnd}
                    onChange={(e) => handleToggle('dndEnd', e.target.value as never)}
                  >
                    {Array.from({ length: 48 }, (_, i) => {
                      const h = String(Math.floor(i / 2)).padStart(2, '0');
                      const m = i % 2 === 0 ? '00' : '30';
                      return <option key={i} value={`${h}:${m}`}>{`${h}:${m}`}</option>;
                    })}
                  </select>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Appareils */}
        <div className="ps-card">
          <div className="ps-card-head">
            <Smartphone size={16} />
            <span>Appareils enregistres ({push.subscriptions.length})</span>
          </div>
          {push.subscriptions.length === 0 ? (
            <div className="ps-empty">
              <Monitor size={28} />
              <p>Aucun appareil. Activez les notifications pour enregistrer cet appareil.</p>
            </div>
          ) : (
            <div className="ps-device-list">
              {push.subscriptions.map((sub) => (
                <div key={sub.id} className="ps-device-row">
                  <div className="ps-device-icon">
                    {sub.device === 'mobile' ? <Smartphone size={18} /> : <Monitor size={18} />}
                  </div>
                  <div className="ps-device-info">
                    <span className="ps-device-name">{sub.browser} {sub.device === 'mobile' ? '(mobile)' : ''}</span>
                    <span className="ps-device-date">Derniere activite: {formatDate(sub.lastActivityAt)}</span>
                  </div>
                  <button
                    className="ps-icon-btn"
                    title="Retirer cet appareil"
                    onClick={() => push.unregister(sub.endpoint)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Analytics */}
          {push.analytics && (
            <div className="ps-analytics">
              <div className="ps-ana-grid">
                <div className="ps-ana-item">
                  <span className="ps-ana-val">{push.analytics.totals.sent}</span>
                  <span className="ps-ana-lbl">Envoyees (14j)</span>
                </div>
                <div className="ps-ana-item">
                  <span className="ps-ana-val">{push.analytics.totals.delivered}</span>
                  <span className="ps-ana-lbl">Delivrees</span>
                </div>
                <div className="ps-ana-item">
                  <span className="ps-ana-val">{push.analytics.totals.clicked}</span>
                  <span className="ps-ana-lbl">Cliquees</span>
                </div>
                <div className="ps-ana-item">
                  <span className="ps-ana-val">
                    {push.analytics.totals.avgResponseMs > 0
                      ? `${Math.round(push.analytics.totals.avgResponseMs / 60000)}m`
                      : '-'}
                  </span>
                  <span className="ps-ana-lbl">Reponse moyenne</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Historique */}
      <div className="ps-card ps-history">
        <div className="ps-card-head">
          <Inbox size={16} />
          <span>Historique recent ({push.historyTotal})</span>
        </div>
        {push.history.length === 0 ? (
          <div className="ps-empty">
            <Inbox size={28} />
            <p>Aucune notification pour le moment</p>
          </div>
        ) : (
          <>
            <div className="ps-history-list">
              {push.history.map((h) => (
                <div key={h.id} className={`ps-history-row ps-${h.priority}`}>
                  <div className="ps-history-left">
                    <span className="ps-history-title">{h.title}</span>
                    <span className="ps-history-body">{h.body}</span>
                    <span className="ps-history-meta">
                      {formatDate(h.sentAt)} · {PRIORITY_LABEL[h.priority] ?? h.priority}
                      {h.groupCount > 1 ? ` · Regroupee (${h.groupCount})` : ''}
                      {h.escalationLevel > 0 ? ` · Escaladee (x${h.escalationLevel})` : ''}
                    </span>
                  </div>
                  <span className={`ps-status-pill ps-status-${h.deliveryStatus}`}>
                    {STATUS_LABEL[h.deliveryStatus] ?? h.deliveryStatus}
                  </span>
                </div>
              ))}
            </div>
            {push.historyTotal > 25 && (
              <div className="ps-pagination">
                <button
                  disabled={historyPage <= 1}
                  onClick={() => { setHistoryPage(historyPage - 1); push.refreshHistory(historyPage - 1); }}
                >
                  Precedent
                </button>
                <span>Page {historyPage}</span>
                <button
                  disabled={historyPage * 25 >= push.historyTotal}
                  onClick={() => { setHistoryPage(historyPage + 1); push.refreshHistory(historyPage + 1); }}
                >
                  Suivant
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Escalade (Super Admin) */}
      {isSuperAdmin && push.escalationConfig && (
        <div className="ps-card">
          <div className="ps-card-head">
            <ShieldAlert size={16} />
            <span>Gestion de l'escalade automatique (Super Admin)</span>
          </div>
          <div className="ps-escalation">
            <label className="ps-escalation-toggle">
              <span>
                <span className="ps-pref-label">Escalade automatique</span>
                <span className="ps-pref-desc">
                  Relance vers le superieur hierarchique si aucune action dans le delai
                </span>
              </span>
              <input
                type="checkbox"
                className="ps-switch"
                checked={push.escalationConfig.enabled}
                onChange={(e) => push.updateEscalation({ enabled: e.target.checked })}
              />
            </label>
            <div className="ps-escalation-grid">
              {(
                [
                  ['criticalEscalationMin', 'Critique (min)', 5],
                  ['highEscalationMin', 'Haute (min)', 10],
                  ['mediumEscalationMin', 'Moyenne (min)', 15],
                  ['groupingWindowMin', 'Fenetre regroupement (min)', 2],
                ] as const
              ).map(([key, label, min]) => (
                <label key={key} className="ps-escalation-field">
                  <span>{label}</span>
                  <select
                    value={push.escalationConfig![key]}
                    onChange={(e) => push.updateEscalation({ [key]: Number(e.target.value) } as never)}
                  >
                    {[min, min * 2, min * 3, min * 4, min * 6, min * 8, min * 12].map((v) => (
                      <option key={v} value={v}>{v} min</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <button className="ps-btn ps-btn-secondary" onClick={handleRunEscalation}>
              <Zap size={15} /> Declencher l'escalade maintenant
            </button>
          </div>
        </div>
      )}

      <div className="ps-footer-note">
        <Clock size={13} />
        Les notifications critiques et les arrets production sont toujours delivres, meme en mode "Ne pas deranger".
      </div>
    </div>
  );
};

export default PushSettings;