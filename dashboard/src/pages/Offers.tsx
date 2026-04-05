import { useState, useEffect } from 'react';
import { api, Offer, Campaign } from '../api';

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [name, setName] = useState('');
  const [niche, setNiche] = useState('');
  const [description, setDescription] = useState('');

  const load = () => {
    api.getOffers().then(setOffers).catch(() => {});
    api.getCampaigns().then(setCampaigns).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (editingOffer) {
      await api.updateOffer(editingOffer.id, { name, niche, description });
    } else {
      await api.createOffer({ name, niche, description });
    }
    setShowForm(false);
    setEditingOffer(null);
    setName(''); setNiche(''); setDescription('');
    load();
  };

  const handleEdit = (offer: Offer) => {
    setEditingOffer(offer);
    setName(offer.name);
    setNiche(offer.niche);
    setDescription(offer.description);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await api.deleteOffer(id);
    load();
  };

  const handleAssign = async (campaignId: string, offerId: string | null) => {
    await api.assignCampaignOffer(campaignId, offerId);
    load();
  };

  return (
    <div>
      <div className="section-header">
        <h2>{offers.length} Offers</h2>
        <button className="btn btn-primary" onClick={() => { setEditingOffer(null); setName(''); setNiche(''); setDescription(''); setShowForm(true); }}>
          + New Offer
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 16, maxWidth: 500 }}>
          <h3 style={{ marginBottom: 12 }}>{editingOffer ? 'Edit Offer' : 'New Offer'}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle}>Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Peptide Setup Webinar" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Niche / Vertical</label>
              <input value={niche} onChange={e => setNiche(e.target.value)} placeholder="e.g. Telehealth, SaaS, Ecommerce" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <input value={description} onChange={e => setDescription(e.target.value)} placeholder="What this offer is about" style={inputStyle} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={!name}>{editingOffer ? 'Save' : 'Create Offer'}</button>
              <button className="btn btn-secondary" onClick={() => { setShowForm(false); setEditingOffer(null); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="rule-list">
        {offers.map(offer => {
          const assignedCampaigns = campaigns.filter(c => c.offerId === offer.id);
          const unassigned = campaigns.filter(c => !c.offerId);

          return (
            <div key={offer.id} className="rule-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <div className="rule-name">{offer.name}</div>
                  {offer.niche && <span className="badge" style={{ background: 'var(--accent)20', color: 'var(--accent)', borderColor: 'var(--accent)40' }}>{offer.niche}</span>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(offer)}>Edit</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(offer.id)}>Delete</button>
                </div>
              </div>
              {offer.description && <p className="text-secondary" style={{ fontSize: 13, marginBottom: 12 }}>{offer.description}</p>}

              <div style={{ fontSize: 13, marginBottom: 8, fontWeight: 500 }}>Assigned Campaigns ({assignedCampaigns.length})</div>
              {assignedCampaigns.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {assignedCampaigns.map(c => (
                    <span key={c.id} className="condition-chip" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {c.name}
                      <button onClick={() => handleAssign(c.id, null)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 14, padding: 0 }}>x</button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-secondary" style={{ fontSize: 12, marginBottom: 12 }}>No campaigns assigned</p>
              )}

              {unassigned.length > 0 && (
                <div>
                  <select
                    onChange={e => { if (e.target.value) handleAssign(e.target.value, offer.id); e.target.value = ''; }}
                    style={{ ...inputStyle, width: 'auto', fontSize: 12, padding: '4px 8px' }}
                    defaultValue=""
                  >
                    <option value="" disabled>+ Assign campaign...</option>
                    {unassigned.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          );
        })}

        {offers.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <p className="text-secondary">No offers yet. Create one to start grouping campaigns and setting offer-specific rules.</p>
          </div>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 14 };
