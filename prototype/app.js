const dialog = document.querySelector('#add-dialog');
const toast = document.querySelector('#toast');
const diagnosis = document.querySelector('#diagnosis');
const badge = document.querySelector('#status-badge');
const title = document.querySelector('#diagnosis-title');
const copy = document.querySelector('#diagnosis-copy');
const estimate = document.querySelector('#estimate');
const progress = document.querySelector('#progress-bar');

document.querySelector('#add-domain').addEventListener('click', () => dialog.showModal());
document.querySelector('#domain-input').addEventListener('input', event => {
  let value = event.target.value.trim().toLowerCase();
  try { value = new URL(value.includes('://') ? value : `https://${value}`).hostname; } catch {}
  document.querySelector('#normalized-domain').textContent = value.replace(/^www\./, '') || 'your domain';
});

document.querySelectorAll('.copy').forEach(button => button.addEventListener('click', async () => {
  await navigator.clipboard?.writeText(button.dataset.copy);
  button.textContent = 'Copied'; toast.classList.add('show');
  setTimeout(() => { toast.classList.remove('show'); button.textContent = 'Copy'; }, 1800);
}));

document.querySelector('#check-now').addEventListener('click', event => {
  event.currentTarget.textContent = 'Checking…';
  setTimeout(() => { event.currentTarget.textContent = 'Checked just now'; toast.querySelector('strong').textContent = 'DNS checked'; toast.querySelector('small').textContent = '2 of 3 resolvers found the record.'; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2200); }, 800);
});

document.querySelector('#email-record').addEventListener('click', () => {
  toast.querySelector('strong').textContent = 'Instructions ready'; toast.querySelector('small').textContent = 'Email draft copied to your clipboard.'; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2200);
});

const states = {
  missing: {badge:'Needs action',className:'missing',title:'We found the record in the wrong place.',copy:'The token was added to acme.com instead of _proof-challenge.acme.com.',estimate:'Move the TXT record to the Name shown below, then check again.',width:'16%'},
  pending: {badge:'Propagating',className:'pending',title:'Your record is correct. DNS is catching up.',copy:'Cloudflare already has the record. Some public resolvers are still using an older answer.',estimate:'<strong>About 8 minutes left</strong> based on acme.com\'s DNS cache.',width:'68%'},
  verified: {badge:'Verified',className:'verified',title:'You proved ownership of acme.com.',copy:'The record is visible from every public resolver we checked.',estimate:'Verified today at 2:49 PM. We’ll keep monitoring the record.',width:'100%'}
};

document.querySelectorAll('.demo-switcher button').forEach(button => button.addEventListener('click', () => {
  const state = states[button.dataset.state];
  document.querySelectorAll('.demo-switcher button').forEach(item => item.classList.remove('active'));
  button.classList.add('active');
  badge.textContent = state.badge; title.textContent = state.title; copy.textContent = state.copy; estimate.innerHTML = state.estimate; progress.style.width = state.width;
  diagnosis.className = `diagnosis ${state.className}`;
  badge.className = `badge ${state.className}-badge`;
}));

document.querySelectorAll('.domain-row').forEach(row => row.addEventListener('click', () => document.querySelector('#detail').scrollIntoView({behavior:'smooth',block:'start'})));
