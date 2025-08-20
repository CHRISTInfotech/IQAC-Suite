/* IQAC Suite – Dashboard UI (frontend only) */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const px = v => Number.parseFloat(v) || 0;

  // Simple tab/anchor navigation
  function goTab(id, hash) {
    const extra = hash ? (hash.startsWith('#') ? hash.slice(1) : hash) : '';
    const suffix = extra ? (extra.startsWith('&') ? extra : `&${extra}`) : '';
    location.hash = `#${id}${suffix}`;
  }
  $('#kpiStudents')?.addEventListener('click', () => goTab('students'));
  $('#kpiClasses')?.addEventListener('click', () => goTab('profile'));
  $('#kpiOrgEvents')?.addEventListener('click', () => goTab('events', '#type=my'));
  $('#kpiPartEvents')?.addEventListener('click', () => goTab('events', '#type=participating'));
  $$('[data-go-tab="profile"]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();goTab('profile');}));
  $$('[data-go-tab="events"]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();goTab('events');}));

  // Donut: Performance / Contribution
  let donut, currentView = 'performance';
  const ctx = $('#donutChart')?.getContext('2d');
  const COLORS = ['#6366f1','#f59e0b','#10b981','#ef4444'];

  function renderDonut(labels, data) {
    if (!ctx) return;
    donut?.destroy();
    donut = new Chart(ctx, {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: COLORS, borderWidth: 0, cutout: '70%' }] },
      options: {
        plugins: { legend: { display: false } },
        responsive: true,
        maintainAspectRatio: true,
        layout:{padding:10}
      }
    });
    const legend = $('#donutLegend');
    if (legend) legend.innerHTML = labels.map((l,i)=>{
      const raw = data[i];
      const val = typeof raw === 'number' ? (Math.round(raw*10)/10).toFixed(1) : raw;
      return `<div class="legend-row"><span class="legend-dot" style="background:${COLORS[i]}"></span><span>${l}</span><strong style="margin-left:auto">${val}%</strong></div>`;
    }).join('');
  }

  async function loadPerformance() {
    try{
      const res = await fetch('/api/student/performance-data/', { headers: { 'X-Requested-With':'XMLHttpRequest' }});
      const j = await res.json();
      renderDonut(j.labels, j.percentages);
    }catch{
      renderDonut(['Excellent','Good','Average','Poor'], [35, 40, 20, 5]);
    }
  }
  async function loadContribution() {
    try{
      const res = await fetch('/api/event-contribution/', { headers: { 'X-Requested-With':'XMLHttpRequest' }});
      const j = await res.json();
      const pct = Number(j.overall_percentage) || 0;
      renderDonut(['My Contribution','Other'], [pct, Math.max(0, 100 - pct)]);
    }catch{
      renderDonut(['Organized','Participated','Reviewed','Other'], [45, 35, 15, 5]);
    }
  }

  async function loadRecentEvents() {
    try {
      const res = await fetch('/api/user/events-data/', { headers: { 'X-Requested-With': 'XMLHttpRequest' }});
      const j = await res.json();
      
      // Update the static actions list with dynamic data if needed
      const actionsList = $('#actionsList');
      if (actionsList && j.events) {
        // Find the proposal tracker section and keep it
        const proposalTracker = actionsList.querySelector('#proposalTracker');
        
        // Add recent events to the top of the actions list
        const recentEventsHtml = j.events.slice(0, 3).map(event => `
          <article class="list-item">
            <div class="bullet ${event.status.toLowerCase()}">
              <i class="fa-regular fa-calendar"></i>
            </div>
            <div class="list-body">
              <h4>${event.title}</h4>
              <p>${event.organization} - ${event.created_at}</p>
            </div>
            <span class="chip-btn">${event.status}</span>
          </article>
        `).join('');
        
        // Insert recent events before existing content
        if (recentEventsHtml) {
          const existingContent = actionsList.innerHTML;
          actionsList.innerHTML = recentEventsHtml + existingContent;
        }
      }
    } catch (error) {
      console.error('Failed to load recent events:', error);
    }
  }

  $$('.seg-btn').forEach(b => b.addEventListener('click', e => {
    $$('.seg-btn').forEach(x => x.classList.remove('active'));
    e.currentTarget.classList.add('active');
    currentView = e.currentTarget.dataset.view;
    const title = $('#perfTitle');
    if (title) title.textContent = currentView === 'performance' ? 'Student Performance' : 'Event Contribution';
    (currentView === 'performance' ? loadPerformance() : loadContribution()).then(syncHeights);
  }));

  // Calendar
  let calRef = new Date();
  let currentCategory = 'all'; // all|support|private|faculty
  let privateTasksKey = 'ems.privateTasks';
  let eventIndexByDate = new Map();
  const fmt2 = v => String(v).padStart(2,'0');
  const isSame = (a,b)=>a.getFullYear()==b.getFullYear()&&a.getMonth()==b.getMonth()&&a.getDate()==b.getDate();

  function buildCalendar() {
    const headTitle = $('#calTitle');
    const grid = $('#calGrid');
    if(!grid || !headTitle) return;

    headTitle.textContent = calRef.toLocaleString(undefined,{month:'long', year:'numeric'});

    const first = new Date(calRef.getFullYear(), calRef.getMonth(), 1);
    const last  = new Date(calRef.getFullYear(), calRef.getMonth()+1, 0);
    const startIdx = first.getDay();
    const prevLast = new Date(calRef.getFullYear(), calRef.getMonth(), 0).getDate();

    const cells = [];
    for(let i=startIdx-1;i>=0;i--){ cells.push({text: prevLast - i, date:null, muted:true}); }
    for(let d=1; d<=last.getDate(); d++){
      const dt = new Date(calRef.getFullYear(), calRef.getMonth(), d);
      cells.push({text:d, date:dt, muted:false});
    }
    while(cells.length % 7 !== 0){ cells.push({text: cells.length%7+1, date:null, muted:true}); }

    // compute dates that have events (or private tasks)
    const eventDates = new Set(eventIndexByDate.keys());
    const privateTasks = new Set(JSON.parse(localStorage.getItem(privateTasksKey)||'[]'));

    grid.innerHTML = cells.map(c=>{
      const today = c.date && isSame(c.date, new Date());
      const iso = c.date ? `${c.date.getFullYear()}-${fmt2(c.date.getMonth()+1)}-${fmt2(c.date.getDate())}` : '';
      const hasEvent = iso && (eventDates.has(iso) || (currentCategory==='private' && privateTasks.has(iso)));
      const markerClass = hasEvent ? (currentCategory==='faculty' ? ' has-meeting' : ' has-event') : '';
      return `<div class="day${c.muted?' muted':''}${today?' today':''}${markerClass}" data-date="${iso}">${c.text}</div>`;
    }).join('');

    grid.querySelectorAll('.day[data-date]').forEach(el=>{
      el.addEventListener('click', ()=> onDayClick(new Date(el.dataset.date)));
    });
  }

  async function openDay(day){
    const yyyy = day.getFullYear(), mm = String(day.getMonth()+1).padStart(2,'0'), dd = String(day.getDate()).padStart(2,'0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const list = $('#upcomingWrap'); if (!list) return;
    // Fetch live, role-aware events for the day
    try {
      const res = await fetch(`/emt/api/events/by-date/?date=${encodeURIComponent(dateStr)}`, { headers:{'X-Requested-With':'XMLHttpRequest'} });
      const j = await res.json();
      const items = j.items || [];
      list.innerHTML = items.length
        ? items.map(e => {
            const viewBtn = e.id ? `<a class="chip-btn" href="/emt/proposal-status/${e.id}/"><i class="fa-regular fa-eye"></i> View</a>` : '';
            return `<div class="u-item"><div>${e.title}</div><div style="display:flex;gap:8px;">${viewBtn}</div></div>`;
          }).join('')
        : `<div class="empty">No events for this date</div>`;
      // Also render in Event Details viewer
      renderEventDetailsFromApi(day, items);
    } catch (e) {
      list.innerHTML = `<div class="empty">No events for this date</div>`;
    }
  }

  function onDayClick(day){
    const yyyy = day.getFullYear(), mm = String(day.getMonth()+1).padStart(2,'0'), dd = String(day.getDate()).padStart(2,'0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    
    if (currentCategory === 'private'){
      // Show confirmation modal first
      showPrivateCalendarConfirmation(day);
      return;
    }
    
    if (currentCategory === 'faculty'){
      // If there are meetings on this date, show details; else open meeting form
      const hasItems = eventIndexByDate.has(dateStr);
      if (hasItems){
        showEventDetails(day);
        openDay(day);
      } else {
        showFacultyMeetingForm(day);
      }
      return;
    }
    
    // Show event details and highlight in event viewer
    showEventDetails(day);
    openDay(day);
  }

  function showPrivateCalendarConfirmation(day) {
    const modal = $('#confirmationModal');
    modal.style.display = 'flex';
    
    $('#cancelConfirm').onclick = () => {
      modal.style.display = 'none';
      showEventDetails(day);
      openDay(day);
    };
    
    $('#confirmOpen').onclick = () => {
      modal.style.display = 'none';
      const yyyy = day.getFullYear(), mm = String(day.getMonth()+1).padStart(2,'0'), dd = String(day.getDate()).padStart(2,'0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const ymd = `${yyyy}${mm}${dd}`;
      const url = `https://www.google.com/calendar/render?action=TEMPLATE&dates=${ymd}/${ymd}&sf=true&output=xml`;
      window.open(url, '_blank', 'noopener');
      
      const tasks = new Set(JSON.parse(localStorage.getItem(privateTasksKey)||'[]'));
      tasks.add(dateStr);
      localStorage.setItem(privateTasksKey, JSON.stringify(Array.from(tasks)));
      buildCalendar();
      showEventDetails(day);
      openDay(day);
    };
  }

  function showFacultyMeetingForm(day) {
    const modal = $('#facultyMeetingModal');
    const form = $('#facultyMeetingForm');
    
    // Set default date
    const yyyy = day.getFullYear(), mm = String(day.getMonth()+1).padStart(2,'0'), dd = String(day.getDate()).padStart(2,'0');
    $('#meetingDate').value = `${yyyy}-${mm}-${dd}`;
    
    modal.style.display = 'flex';
    
    // Load dynamic data
    loadPlaces('#meetingPlace');
    loadPeople('#meetingParticipants');
    
    // Handle form submission
    form.onsubmit = async (e) => {
      e.preventDefault();
      await submitFacultyMeeting(form, modal);
    };
    
    // Handle close events
    $('#closeFacultyModal').onclick = () => modal.style.display = 'none';
    $('#cancelMeeting').onclick = () => modal.style.display = 'none';
  }

  async function submitFacultyMeeting(form, modal) {
    const formData = new FormData(form);
    const title = $('#meetingTitle').value;
    const date = $('#meetingDate').value;
    const time = $('#meetingTime').value;
    const place = $('#meetingPlace').value;
    const notes = $('#meetingNotes').value;
    
  // Collect selected participant display names (keep as array)
  const participants = Array.from($('#meetingParticipants').selectedOptions).map(opt => opt.text);
    
    try {
      // Get user's organizations
      const orgRes = await fetch('/api/event-contribution-data?org=all', {
        headers:{'X-Requested-With':'XMLHttpRequest', 'Accept': 'application/json'},
        credentials: 'same-origin'
      });
      let orgData;
      try {
        orgData = await orgRes.json();
      } catch (e) {
        const txt = await orgRes.text();
        if (orgRes.status === 403 && /csrf|forbidden/i.test(txt)) {
          throw new Error('CSRF or permission issue while loading organizations. Please refresh and try again.');
        }
        if (orgRes.redirected || /<title>Log in/i.test(txt)) {
          throw new Error('Session expired. Please log in again.');
        }
        throw new Error('Failed to load organizations (non-JSON response).');
      }
      const orgs = orgData.organizations || [];
      
      let orgId = orgs[0]?.id;
      if (orgs.length > 1) {
        const msg = 'Choose organization:\n' + orgs.map((o,i)=>`${i+1}. ${o.name}`).join('\n');
        const sel = parseInt(prompt(msg)||'1', 10);
        if (!isNaN(sel) && orgs[sel-1]) orgId = orgs[sel-1].id;
      }
      
      if (!orgId) throw new Error('No organization selected');
      
      const when = new Date(`${date}T${time}`).toISOString();
      
      const response = await fetch('/api/calendar/faculty/create/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRFToken': getCsrfToken()
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          title,
          organization_id: orgId,
          scheduled_at: when,
          place,
          // Send as array; backend will ", ".join()
          participants: participants,
          description: notes
        })
      });
      
      // Try to parse JSON safely; handle HTML/redirect responses
      const ct = (response.headers.get('content-type') || '').toLowerCase();
      if (response.ok && ct.includes('application/json')) {
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Unknown error');
        modal.style.display = 'none';
        form.reset();
        await loadCalendarData();
        showSuccessMessage('Meeting scheduled successfully!');
      } else {
        // Non-JSON or error status
        if (ct.includes('application/json')) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create meeting');
        } else {
          const text = await response.text();
          if (response.status === 403 && /csrf/i.test(text)) {
            throw new Error('CSRF validation failed. Please refresh the page and try again.');
          }
          if (response.redirected || /<title>Log in/i.test(text)) {
            throw new Error('Session expired. Please log in again.');
          }
          throw new Error('Server returned a non-JSON response. Please try again.');
        }
      }
    } catch (ex) {
      alert(`Error: ${ex.message}`);
    }
  }

  // Minimal CSRF cookie reader compatible with Django
  function getCsrfToken() {
    const name = 'csrftoken=';
    const cookies = document.cookie ? document.cookie.split(';') : [];
    for (let c of cookies) {
      c = c.trim();
      if (c.startsWith(name)) return decodeURIComponent(c.substring(name.length));
    }
    return '';
  }

  function showEventDetails(day) {
    const yyyy = day.getFullYear(), mm = String(day.getMonth()+1).padStart(2,'0'), dd = String(day.getDate()).padStart(2,'0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const content = $('#eventDetailsContent');
    const clearBtn = $('#clearEventDetails');
    
    if (!content) return;
    
  const events = (window.DASHBOARD_EVENTS||[]).filter(e => e.date === dateStr);
    
    if (events.length > 0) {
      content.innerHTML = events.map(e => `
        <div class="event-detail-item">
          <div class="event-detail-title">${e.title}</div>
          <div class="event-detail-meta">
            <i class="fa-regular fa-clock"></i> ${e.datetime ? new Date(e.datetime).toLocaleString() : 'All day'}
            ${e.venue ? `<br><i class="fa-solid fa-location-dot"></i> ${e.venue}` : ''}
          </div>
          <div class="event-detail-actions">
            ${e.view_url ? `<a class="chip-btn" href="${e.view_url}"><i class="fa-regular fa-eye"></i> View</a>` : ''}
            ${!e.past && e.gcal_url ? `<a class="chip-btn" target="_blank" href="${e.gcal_url}"><i class="fa-regular fa-calendar-plus"></i> Add to Google</a>` : ''}
          </div>
        </div>
      `).join('');
      clearBtn.style.display = 'inline-flex';
    } else {
      content.innerHTML = `<div class="empty">No events for ${day.toLocaleDateString()}</div>`;
      clearBtn.style.display = 'none';
    }
  }

  function renderEventDetailsFromApi(day, items){
    const content = $('#eventDetailsContent');
    const clearBtn = $('#clearEventDetails');
    if (!content) return;
    if ((items||[]).length > 0){
      content.innerHTML = items.map(e=>`
        <div class="event-detail-item">
          <div class="event-detail-title">${e.title}</div>
          <div class="event-detail-meta">
            <i class="fa-regular fa-clock"></i> ${e.datetime ? new Date(e.datetime).toLocaleString() : 'All day'}
            ${e.venue ? `<br><i class=\"fa-solid fa-location-dot\"></i> ${e.venue}` : ''}
          </div>
          <div class="event-detail-actions">
            ${e.id ? `<button class="chip-btn" data-open-event="${e.id}"><i class="fa-regular fa-eye"></i> View Details</button>` : ''}
          </div>
        </div>`).join('');
      content.querySelectorAll('[data-open-event]')
        .forEach(btn=> btn.addEventListener('click', ()=> openEventModal(btn.getAttribute('data-open-event'))));
      clearBtn.style.display = 'inline-flex';
    } else {
      content.innerHTML = `<div class="empty">No events for ${day.toLocaleDateString()}</div>`;
      clearBtn.style.display = 'none';
    }
  }

  $('#calPrev')?.addEventListener('click', ()=>{ calRef = new Date(calRef.getFullYear(), calRef.getMonth()-1, 1); buildCalendar(); syncHeights(); });
  $('#calNext')?.addEventListener('click', ()=>{ calRef = new Date(calRef.getFullYear(), calRef.getMonth()+1, 1); buildCalendar(); syncHeights(); });

  // Add event scope passthrough - now opens modal instead
  $('#addEventBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    showEventCreationModal();
  });

  // Chart click handler for proposal tracking
  $('#chartContainer')?.addEventListener('click', () => {
    loadAndShowProposals();
  });

  // Clear event details
  $('#clearEventDetails')?.addEventListener('click', () => {
    $('#eventDetailsContent').innerHTML = '<div class="empty">Click on an event in the calendar to view details</div>';
    $('#clearEventDetails').style.display = 'none';
  });

  function showEventCreationModal() {
    const modal = $('#eventCreationModal');
    modal.style.display = 'flex';
    
    // Load places
    loadPlaces('#eventVenue');
    
    // Handle form submission
    $('#eventCreationForm').onsubmit = async (e) => {
      e.preventDefault();
      // This would redirect to the actual event creation page
      const scope = $('#visibilitySelect')?.value || 'all';
      window.location.href = `/suite/submit/?via=dashboard&scope=${encodeURIComponent(scope)}`;
    };
    
    // Handle close events
    $('#closeEventModal').onclick = () => modal.style.display = 'none';
    $('#cancelEvent').onclick = () => modal.style.display = 'none';
  }

  async function loadPlaces(selector) {
    try {
      const response = await fetch('/api/dashboard/places/', { headers: {'X-Requested-With':'XMLHttpRequest', 'Accept': 'application/json'} });
      const data = await response.json();
      const select = $(selector);
      if (select) {
        select.innerHTML = '<option value="">Select venue...</option>' + 
          data.places.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
      }
    } catch (ex) {
      console.error('Failed to load places:', ex);
    }
  }

  async function loadPeople(selector) {
    try {
      const response = await fetch('/api/dashboard/people/', { headers: {'X-Requested-With':'XMLHttpRequest', 'Accept': 'application/json'} });
      const data = await response.json();
      const select = $(selector);
      if (select) {
        select.innerHTML = data.people.map(p => 
          `<option value="${p.id}">${p.name} (${p.role})</option>`
        ).join('');
      }
    } catch (ex) {
      console.error('Failed to load people:', ex);
    }
  }

  async function loadAndShowProposals() {
    try {
      const response = await fetch('/api/user/proposals/', { headers: {'X-Requested-With':'XMLHttpRequest'} });
      const data = await response.json();
      
      const tracker = $('#proposalTracker');
      const list = $('#proposalsList');
      
      if (data.proposals && data.proposals.length > 0) {
        const seen = new Set();
        const uniq = [];
        for (const p of data.proposals){
          const key = (p.title||'').trim().toLowerCase();
          if (seen.has(key)) continue; seen.add(key); uniq.push(p);
        }
        list.innerHTML = uniq.map(p => `
          <article class="list-item">
            <div class="bullet ${p.status}"><i class="fa-regular fa-file-lines"></i></div>
            <div class="list-body">
              <h4>${p.title}</h4>
              <p>${p.status_display}</p>
            </div>
            <a href="${p.view_url}" class="chip-btn"><i class="fa-regular fa-eye"></i> View</a>
          </article>
        `).join('');
        tracker.style.display = 'block';
      } else {
        list.innerHTML = '<div class="empty">No proposals found</div>';
        tracker.style.display = 'block';
      }
    } catch (ex) {
      console.error('Failed to load proposals:', ex);
    }
  }

  function showSuccessMessage(message) {
    // Simple success message - could be enhanced with a toast system
    const temp = document.createElement('div');
    temp.style.cssText = 'position:fixed;top:20px;right:20px;background:#10b981;color:white;padding:12px 16px;border-radius:6px;z-index:1001;';
    temp.textContent = message;
    document.body.appendChild(temp);
    setTimeout(() => document.body.removeChild(temp), 3000);
  }

  // Load Member tasks (Inbox) if section exists
  async function loadMemberTasks(){
    const list = $('#memberTasksList');
    if (!list) return;
    try{
      const res = await fetch('/emt/api/task/member/', { headers:{'X-Requested-With':'XMLHttpRequest'} });
      const j = await res.json();
      const items = j.items||[];
      list.innerHTML = items.length? items.map(t=>`
        <article class="list-item">
          <div class="bullet ${t.status}"><i class="fa-regular fa-clipboard"></i></div>
          <div class="list-body"><h4>${t.event_title} — ${t.task_type}</h4><p>Priority: ${t.priority}${t.deadline? ' · Due '+ new Date(t.deadline).toLocaleString():''}</p></div>
          <span class="chip-btn">${t.progress||0}%</span>
        </article>`).join('') : '<div class="empty">No tasks assigned</div>';
    }catch{ list.innerHTML = '<div class="empty">No tasks assigned</div>'; }
  }

  // Dropdown filtering
  $('#visibilitySelect')?.addEventListener('change', (e)=>{
    currentCategory = e.target.value || 'all';
    loadCalendarData();
  });

  async function loadCalendarData(){
    try{
      // Use role-aware endpoint; map Support to filter=support
      const filter = currentCategory === 'support' ? 'support' : 'all';
      const res = await fetch(`/emt/api/calendar/role/?filter=${encodeURIComponent(filter)}`, { headers:{'X-Requested-With':'XMLHttpRequest'} });
      const j = await res.json();
      window.DASHBOARD_EVENTS = j.items || [];
      // index by date for quick highlight
      eventIndexByDate = new Map();
      (window.DASHBOARD_EVENTS||[]).forEach(e=>{
        if (!e.date) return;
        const list = eventIndexByDate.get(e.date) || [];
        list.push(e);
        eventIndexByDate.set(e.date, list);
      });
    }catch{ window.DASHBOARD_EVENTS = []; eventIndexByDate = new Map(); }
    buildCalendar(); openDay(new Date());
  }

  // Event modal: chat + head assignment
  let currentProposalId = null;
  function openEventModal(proposalId){
    currentProposalId = proposalId;
    const modal = $('#eventDetailsModal');
    const meta = $('#edmMeta');
    const chat = $('#edmChat');
    modal.style.display = 'flex';
    // Load minimal meta from current events list
    const e = (window.DASHBOARD_EVENTS||[]).find(x=>String(x.id)===String(proposalId));
    meta.textContent = e ? `${e.title} ${e.datetime? '· '+ new Date(e.datetime).toLocaleString():''} ${e.venue? '· '+e.venue:''}` : '';
    loadChat();
  }
  $('#closeEdm')?.addEventListener('click', ()=>{ $('#eventDetailsModal').style.display='none'; });
  async function loadChat(){
    if (!currentProposalId) return;
    const chat = $('#edmChat');
    try{
      const res = await fetch(`/emt/api/chat/${currentProposalId}/`, { headers:{'X-Requested-With':'XMLHttpRequest'} });
      const j = await res.json();
      chat.innerHTML = (j.items||[]).map(m=>
        `<div class="msg"><div class="who">${m.sender_role||''}</div><div class="text">${m.message}</div></div>`
      ).join('') || '<div class="empty">No messages</div>';
      chat.scrollTop = chat.scrollHeight;
    }catch{
      chat.innerHTML = '<div class="empty">Cannot load chat</div>';
    }
  }
  $('#edmSend')?.addEventListener('click', async (e)=>{
    e.preventDefault();
    const inp = $('#edmInput');
    const msg = (inp.value||'').trim();
    if (!msg || !currentProposalId) return;
    try{
      const res = await fetch(`/emt/api/chat/${currentProposalId}/send/`, {
        method:'POST', headers:{'Content-Type':'application/json','X-Requested-With':'XMLHttpRequest','X-CSRFToken':getCsrfToken()},
        body: JSON.stringify({ message: msg })
      });
      const j = await res.json(); if (j.success){ inp.value=''; loadChat(); }
    }catch{}
  });
  $('#btnAssignTask')?.addEventListener('click', async (e)=>{
    e.preventDefault(); if (!currentProposalId) return;
    const assigned_to = Number($('#assignTo').value||'');
    const task_type = ($('#taskType').value||'').trim();
    const priority = $('#taskPriority').value||'normal';
    const deadline = $('#taskDeadline').value||'';
    const description = ($('#taskDesc').value||'').trim();
    if (!assigned_to || !task_type || !deadline){
      alert('Please select member, task type, and deadline');
      return;
    }
    try{
      const res = await fetch(`/emt/api/task/assign/${currentProposalId}/`, { method:'POST', headers:{'Content-Type':'application/json','X-Requested-With':'XMLHttpRequest','X-CSRFToken':getCsrfToken()}, body: JSON.stringify({ assigned_to, task_type, priority, deadline, description }) });
      const j = await res.json();
      if (j.success){ showSuccessMessage('Task assigned'); $('#eventDetailsModal').style.display='none'; }
      else if (j.error){ alert(j.error); }
    }catch(ex){ alert('Failed to assign task'); }
  });

  // Heatmap
  async function renderHeatmap(){
    const wrap = $('#heatmapContainer'); if (!wrap) return;
    try{
      const res = await fetch('/api/student/contributions/', { headers:{'X-Requested-With':'XMLHttpRequest'} });
      const j = await res.json();
      const contributions = j.contributions || [];
      // Build GitHub-style grid
      const cols = 53, rows = 7;
      const grid = document.createElement('div'); grid.className='hm-grid';
      // Map date->level
      const map = Object.create(null);
      contributions.forEach(c=>{ map[c.date] = c.level; });
      // Start 52 weeks back
      const today = new Date();
      const start = new Date(today); start.setDate(today.getDate() - (52*7));
      let cur = new Date(start);
      for (let c=0; c<cols; c++){
        const col = document.createElement('div'); col.className='hm-col';
        for (let r=0; r<rows; r++){
          const cell = document.createElement('div'); cell.className='hm-cell';
          const dateStr = cur.toISOString().split('T')[0];
          const lvl = map[dateStr] || 0;
          if (lvl>0) cell.classList.add(`l${lvl}`);
          cell.title = lvl>0 ? `${dateStr}: ${lvl} contribution${lvl>1?'s':''}` : `${dateStr}: No contributions`;
          col.appendChild(cell);
          cur.setDate(cur.getDate()+1);
        }
        grid.appendChild(col);
      }
      wrap.innerHTML=''; wrap.appendChild(grid);
      fitHeatmap();
    }catch{
      // graceful no-op on failure
      wrap.innerHTML = '<div class="empty">No contribution data</div>';
    }
  }

function fitHeatmap(){
  const wrap = $('#heatmapContainer'); if(!wrap) return;
  const cols = 53, rows = 7, gap = 3;
  const cs = getComputedStyle(wrap);
  const availW = wrap.clientWidth  - (parseFloat(cs.paddingLeft)||0) - (parseFloat(cs.paddingRight)||0);
  const availH = wrap.clientHeight - (parseFloat(cs.paddingTop)||0)  - (parseFloat(cs.paddingBottom)||0);
  const size = Math.max(4, Math.floor(Math.min(
    (availW - (cols - 1) * gap) / cols,
    (availH - (rows - 1) * gap) / rows
  )));
  wrap.style.setProperty('--hm-size', size + 'px');
  wrap.style.setProperty('--hm-gap',  gap  + 'px');
}


  // To-do functionality removed - replaced with event details viewer

  function syncHeights(){
    const isDesktop = window.innerWidth > 1200;
    const root = document.documentElement;
    const perf = $('#cardPerformance');
    const acts = $('#cardActions');
    const cal  = $('#cardCalendar');
    const eventDetails = $('#cardEventDetails');
    const contrib = $('#cardContribution');
  
    if(!isDesktop){
      ['--calH','--contribH','--eventDetailsH'].forEach(v=>root.style.removeProperty(v));
      [perf, acts, cal, eventDetails].forEach(el=>{ if(el){ el.style.height=''; el.style.minHeight=''; }});
      return;
    }
  
    // 1) Match Actions + Performance exactly to Calendar height
    if (cal) {
      const calH = Math.ceil(cal.getBoundingClientRect().height);
      root.style.setProperty('--calH', calH + 'px');
      cal.style.height  = calH + 'px';
      if (acts) acts.style.height = calH + 'px';
      if (perf) perf.style.height = calH + 'px';
    }
  
    // 2) Event Details equals Contribution
    if (contrib && eventDetails) {
      const contribH = Math.ceil(contrib.getBoundingClientRect().height);
      root.style.setProperty('--contribH', contribH + 'px');
      eventDetails.style.height = contribH + 'px';
    }
    fitHeatmap();
  }  

  const debounce = (fn,ms=120)=>{ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; };

  // Boot
  document.addEventListener('DOMContentLoaded', () => {
    loadPerformance();
    loadAndShowProposals();
  loadMemberTasks();
    // Removed recent events feed to keep only user's proposals in Actions & Proposals
    // loadRecentEvents();
    loadCalendarData();
    renderHeatmap();
    requestAnimationFrame(()=>{ syncHeights(); });
  });

  window.addEventListener('load', ()=>syncHeights());
  window.addEventListener('resize', debounce(syncHeights, 150));
})();
