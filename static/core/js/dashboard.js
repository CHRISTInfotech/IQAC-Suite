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
    if (legend) legend.innerHTML = labels.map((l,i)=>
      `<div class="legend-row"><span class="legend-dot" style="background:${COLORS[i]}"></span><span>${l}</span><strong style="margin-left:auto">${data[i]}%</strong></div>`
    ).join('');
  }

  async function loadPerformance() {
    try{
      const res = await fetch('/api/student-performance/', { headers: { 'X-Requested-With':'XMLHttpRequest' }});
      const j = await res.json();
      renderDonut(j.labels, j.percentages);
    }catch{
      renderDonut(['Excellent','Good','Average','Poor'], [35, 40, 20, 5]);
    }
  }
  async function loadContribution() {
    try{
      const res = await fetch('/api/event-contribution-summary/', { headers: { 'X-Requested-With':'XMLHttpRequest' }});
      const j = await res.json();
      renderDonut(j.labels, j.percentages);
    }catch{
      renderDonut(['Organized','Participated','Reviewed','Other'], [45, 35, 15, 5]);
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
  let currentMode = 'all';
  let eventsData = {
    all: [],
    private: [],
    teachers: []
  };

  const fmt2 = v => String(v).padStart(2,'0');
  const isSame = (a,b)=>a.getFullYear()==b.getFullYear()&&a.getMonth()==b.getMonth()&&a.getDate()==b.getDate();

  function loadCalendarEvents() {
    console.log('Loading calendar events...');
    
    // Load existing events from window.DASHBOARD_EVENTS (all/public events)
    eventsData.all = window.DASHBOARD_EVENTS || [];
    console.log('Loaded public events:', eventsData.all.length);
    
    // Start async loading of private and announcement events
    Promise.all([
      loadPrivateEvents(),
      loadAnnouncementEvents()
    ]).then(() => {
      console.log('All events loaded, building calendar...');
      console.log('Final events data:', {
        all: eventsData.all.map(e => `${e.title} on ${e.date}`),
        private: eventsData.private.map(e => `${e.title} on ${e.date}`),
        teachers: eventsData.teachers.map(e => `${e.title} on ${e.date}`)
      });
      buildCalendar();
      // Show today's events by default
      openDay(new Date());
    });
  }

  async function loadPrivateEvents() {
    try {
      console.log('Fetching private events...');
      const res = await fetch('/api/private-calendar-events/', {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });
      if (res.ok) {
        const data = await res.json();
        eventsData.private = data.events || [];
        console.log('Loaded private events:', eventsData.private.length);
      } else {
        console.error('Failed to fetch private events:', res.status);
      }
    } catch (error) {
      console.error('Failed to load private events:', error);
      eventsData.private = [];
    }
  }

  async function loadAnnouncementEvents() {
    try {
      console.log('Fetching faculty announcement events...');
      const res = await fetch('/api/announcement-events/', {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });
      if (res.ok) {
        const data = await res.json();
        eventsData.teachers = data.events || [];
        console.log('Loaded faculty announcement events:', eventsData.teachers.length);
      } else {
        console.error('Failed to fetch announcement events:', res.status);
      }
    } catch (error) {
      console.error('Failed to load announcement events:', error);
      eventsData.teachers = [];
    }
  }

  function getEventsForDate(dateStr) {
    const events = [];
    
    console.log(`Getting events for ${dateStr}, mode: ${currentMode}`);
    console.log('Available events:', {
      all: eventsData.all.length,
      private: eventsData.private.length,
      teachers: eventsData.teachers.length
    });
    
    if (currentMode === 'all') {
      // Show all public events, excluding private ones
      events.push(...eventsData.all.filter(e => e.date === dateStr));
      events.push(...eventsData.teachers.filter(e => e.date === dateStr));
    } else if (currentMode === 'private') {
      // Show only private events
      events.push(...eventsData.private.filter(e => e.date === dateStr));
    } else if (currentMode === 'teachers') {
      // Show only announcement/teacher events
      events.push(...eventsData.teachers.filter(e => e.date === dateStr));
    }
    
    console.log(`Found ${events.length} events for ${dateStr}`);
    
    // Return all events for the date, sorted by time
    return events.sort((a, b) => {
      if (a.time && b.time) {
        return a.time.localeCompare(b.time);
      } else if (a.time) {
        return -1;
      } else if (b.time) {
        return 1;
      }
      return 0;
    });
  }

  function hasEventsForDate(dateStr) {
    const publicEvents = eventsData.all.filter(e => e.date === dateStr);
    const privateEvents = eventsData.private.filter(e => e.date === dateStr);
    const teacherEvents = eventsData.teachers.filter(e => e.date === dateStr);
    
    return {
      hasPublic: publicEvents.length > 0,
      hasPrivate: privateEvents.length > 0,
      hasTeacher: teacherEvents.length > 0,
      total: publicEvents.length + privateEvents.length + teacherEvents.length
    };
  }

  function buildCalendar() {
    const headTitle = $('#calTitle');
    const grid = $('#calGrid');
    if(!grid || !headTitle) return;

    console.log('Building calendar for mode:', currentMode);
    console.log('Available events:', eventsData);

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

    grid.innerHTML = cells.map(c=>{
      const today = c.date && isSame(c.date, new Date());
      const iso = c.date ? `${c.date.getFullYear()}-${fmt2(c.date.getMonth()+1)}-${fmt2(c.date.getDate())}` : '';
      
      let eventClasses = '';
      if (c.date) {
        const eventInfo = hasEventsForDate(iso);
        
        if (eventInfo.total > 0) {
          if (currentMode === 'all') {
            if (eventInfo.hasPublic && eventInfo.hasTeacher) {
              eventClasses = ' has-multiple-events';
            } else if (eventInfo.hasPublic) {
              eventClasses = ' has-events';
            } else if (eventInfo.hasTeacher) {
              eventClasses = ' has-announcement-events';
            }
          } else if (currentMode === 'private' && eventInfo.hasPrivate) {
            eventClasses = ' has-private-events';
          } else if (currentMode === 'teachers' && eventInfo.hasTeacher) {
            eventClasses = ' has-announcement-events';
          }
        }
      }
      
      return `<div class="day${c.muted?' muted':''}${today?' today':''}${eventClasses}" data-date="${iso}">${c.text}</div>`;
    }).join('');

    grid.querySelectorAll('.day[data-date]').forEach(el=>{
      el.addEventListener('click', ()=> {
        const date = new Date(el.dataset.date);
        if (currentMode === 'private') {
          openPrivateEventModal(date);
        } else if (currentMode === 'teachers') {
          // Show events for the day AND offer to add announcement
          openDay(date);
          // Also show quick add announcement button in the events display
        } else {
          openDay(date);
        }
      });
    });
  }

  function openDay(day){
    const yyyy = day.getFullYear(), mm = String(day.getMonth()+1).padStart(2,'0'), dd = String(day.getDate()).padStart(2,'0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const list = document.querySelector('.upcoming-content'); if (!list) return;
    
    // Get ALL events for this date (including past events)
    const allEvents = getEventsForDate(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let content = '';
    
    // Add "Add Announcement" button if in teachers mode
    if (currentMode === 'teachers') {
      const dateForButton = `${yyyy}-${mm}-${dd}`;
      content += `
        <div class="add-announcement-section" style="margin-bottom: 16px;">
          <button class="btn btn-primary" onclick="window.openAnnouncementEventModal(new Date('${dateForButton}'))" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <i class="fa-solid fa-bullhorn"></i>
            Add Faculty Announcement for ${day.toLocaleDateString()}
          </button>
        </div>
      `;
    }
    
    if (allEvents.length === 0) {
      content += `<div class="empty">No events for ${day.toLocaleDateString()}</div>`;
      list.innerHTML = content;
      return;
    }
    
    // Show all events for the selected date (past and future)
    content += allEvents.map(e => {
      const eventTypeIcon = getEventTypeIcon(e);
      const eventDate = new Date(e.date);
      eventDate.setHours(0, 0, 0, 0);
      
      // Check if event is in the past
      let isPastEvent = eventDate < today;
      if (eventDate.getTime() === today.getTime() && e.time) {
        // For today's events, check time as well
        const [hours, minutes] = e.time.split(':');
        const eventDateTime = new Date();
        eventDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        const now = new Date();
        isPastEvent = eventDateTime < now;
      }
      
      const googleCalLink = generateGoogleCalendarLink(e);
      
      return `
        <div class="u-item ${isPastEvent ? 'past-event' : ''}">
          <div class="event-details">
            <div class="event-title">
              ${eventTypeIcon} ${e.title}
              ${e.event_type ? `<span class="event-badge">${e.event_type}</span>` : ''}
              ${isPastEvent ? `<span class="event-badge past-badge">Past</span>` : ''}
            </div>
            ${e.time ? `<div class="event-time"><i class="fa-solid fa-clock"></i> ${e.time}</div>` : ''}
            ${e.location ? `<div class="event-location"><i class="fa-solid fa-location-dot"></i> ${e.location}</div>` : ''}
            ${e.event_focus_type ? `<div class="event-category"><i class="fa-solid fa-tag"></i> ${e.event_focus_type}</div>` : ''}
          </div>
          <div class="event-actions">
            ${!isPastEvent ? `
              <a class="chip-btn google-cal-btn" href="${googleCalLink}" target="_blank" title="Add to Google Calendar">
                <i class="fab fa-google"></i>
              </a>
            ` : ''}
            ${e.id && !e.isPrivate ? `
              <a class="chip-btn" href="/event/${e.id}/details/" title="View Event Details">
                <i class="fa-regular fa-eye"></i> View Event
              </a>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
    
    list.innerHTML = content;
  }

  function getEventTypeIcon(event) {
    if (event.isPrivate) return '<i class="fa-solid fa-user text-green"></i>';
    if (event.isAnnouncement || event.event_type) return '<i class="fa-solid fa-bullhorn text-orange"></i>';
    return '<i class="fa-regular fa-calendar text-primary"></i>';
  }

  function generateGoogleCalendarLink(event) {
    const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
    const title = encodeURIComponent(event.title);
    const details = encodeURIComponent(event.description || '');
    const location = encodeURIComponent(event.location || '');
    
    let dates = '';
    if (event.date) {
      const eventDate = new Date(event.date);
      if (event.time && !event.is_all_day) {
        const [hours, minutes] = event.time.split(':');
        eventDate.setHours(parseInt(hours), parseInt(minutes));
        const endDate = new Date(eventDate.getTime() + 60 * 60 * 1000); // 1 hour default
        dates = `&dates=${eventDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
      } else {
        const nextDay = new Date(eventDate);
        nextDay.setDate(nextDay.getDate() + 1);
        dates = `&dates=${eventDate.toISOString().split('T')[0].replace(/-/g, '')}/${nextDay.toISOString().split('T')[0].replace(/-/g, '')}`;
      }
    }
    
    return `${baseUrl}&text=${title}&details=${details}&location=${location}${dates}`;
  }

  $('#calPrev')?.addEventListener('click', ()=>{ calRef = new Date(calRef.getFullYear(), calRef.getMonth()-1, 1); buildCalendar(); syncHeights(); });
  $('#calNext')?.addEventListener('click', ()=>{ calRef = new Date(calRef.getFullYear(), calRef.getMonth()+1, 1); buildCalendar(); syncHeights(); });

  // Calendar mode switching
  $('#visibilitySelect')?.addEventListener('change', (e) => {
    currentMode = e.target.value;
    console.log('Mode switched to:', currentMode);
    buildCalendar();
    
    // Clear the upcoming events display
    const upcomingContent = document.querySelector('.upcoming-content');
    if (upcomingContent) {
      upcomingContent.innerHTML = '<div class="empty">Select a date to view events</div>';
    }
  });

  // Add event scope passthrough
  $('#addEventBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    const mode = $('#visibilitySelect')?.value || 'all';
    
    if (mode === 'private') {
      openPrivateEventModal();
    } else if (mode === 'teachers') {
      openAnnouncementEventModal();
    } else {
      // Redirect to main event creation
      window.location.href = `/suite/submit/?via=dashboard&scope=${encodeURIComponent(mode)}`;
    }
  });

  // Private Event Modal Functions
  function openPrivateEventModal(selectedDate = null) {
    const modal = $('#privateEventModal');
    const dateInput = $('#eventDate');
    
    if (selectedDate) {
      const yyyy = selectedDate.getFullYear();
      const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const dd = String(selectedDate.getDate()).padStart(2, '0');
      dateInput.value = `${yyyy}-${mm}-${dd}`;
    }
    
    modal.style.display = 'flex';
  }

  function closePrivateEventModal() {
    const modal = $('#privateEventModal');
    modal.style.display = 'none';
    $('#privateEventForm').reset();
  }

  function openFacultyAnnouncementModal(selectedDate = null) {
    const modal = $('#announcementEventModal');
    const dateInput = $('#announcementDate');
    
    if (selectedDate) {
      const yyyy = selectedDate.getFullYear();
      const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const dd = String(selectedDate.getDate()).padStart(2, '0');
      dateInput.value = `${yyyy}-${mm}-${dd}`;
    }
    
    modal.style.display = 'flex';
  }

  function openAnnouncementEventModal(selectedDate = null) {
    return openFacultyAnnouncementModal(selectedDate);
  }

  // Make functions available globally
  window.openAnnouncementEventModal = openAnnouncementEventModal;

  function closeAnnouncementEventModal() {
    const modal = $('#announcementEventModal');
    modal.style.display = 'none';
    $('#announcementEventForm').reset();
  }

  // Modal event listeners
  $('#closePrivateModal')?.addEventListener('click', closePrivateEventModal);
  $('#cancelPrivateEvent')?.addEventListener('click', closePrivateEventModal);
  $('#closeAnnouncementModal')?.addEventListener('click', closeAnnouncementEventModal);
  $('#cancelAnnouncementEvent')?.addEventListener('click', closeAnnouncementEventModal);

  // Close modal when clicking outside
  $('#privateEventModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closePrivateEventModal();
  });
  $('#announcementEventModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeAnnouncementEventModal();
  });

  // Form submissions
  $('#privateEventForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    data.is_all_day = formData.has('is_all_day');
    const addToGoogle = formData.has('add_to_google');
    
    try {
      const response = await fetch('/api/private-calendar-events/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Add to Google Calendar if requested
        if (addToGoogle && result.event) {
          const googleLink = generateGoogleCalendarLink(result.event);
          window.open(googleLink, '_blank');
        }
        
        // Refresh calendar
        await loadPrivateEvents();
        buildCalendar();
        closePrivateEventModal();
        
        // Show success message
        showNotification('Private event created successfully!', 'success');
      } else {
        const error = await response.json();
        showNotification(error.message || 'Failed to create event', 'error');
      }
    } catch (error) {
      console.error('Error creating private event:', error);
      showNotification('Failed to create event', 'error');
    }
  });

  $('#announcementEventForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    data.is_all_day = formData.has('is_all_day');
    data.notify_participants = formData.has('notify_participants');
    const addToGoogle = formData.has('add_to_google');
    
    try {
      const response = await fetch('/api/announcement-events/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Add to Google Calendar if requested
        if (addToGoogle && result.event) {
          const googleLink = generateGoogleCalendarLink(result.event);
          window.open(googleLink, '_blank');
        }
        
        // Refresh calendar
        await loadAnnouncementEvents();
        buildCalendar();
        closeAnnouncementEventModal();
        
        // Show success message
        showNotification('Faculty announcement created successfully!', 'success');
      } else {
        const error = await response.json();
        showNotification(error.message || 'Failed to create faculty announcement', 'error');
      }
    } catch (error) {
      console.error('Error creating announcement event:', error);
      showNotification('Failed to create faculty announcement', 'error');
    }
  });

  // Helper functions
  function getCsrfToken() {
    const token = document.querySelector('[name=csrfmiddlewaretoken]');
    return token ? token.value : '';
  }

  function showNotification(message, type = 'info') {
    // Simple notification system - you can enhance this
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      z-index: 1001;
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;
    
    if (type === 'success') {
      notification.style.background = '#10b981';
    } else if (type === 'error') {
      notification.style.background = '#ef4444';
    } else {
      notification.style.background = '#6366f1';
    }
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Hide notification after 3 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }

  // All-day checkbox handling
  $('#isAllDay')?.addEventListener('change', (e) => {
    const timeInput = $('#eventTime');
    timeInput.disabled = e.target.checked;
    if (e.target.checked) {
      timeInput.value = '';
    }
  });

  $('#isAnnouncementAllDay')?.addEventListener('change', (e) => {
    const timeInput = $('#announcementTime');
    timeInput.disabled = e.target.checked;
    if (e.target.checked) {
      timeInput.value = '';
    }
  });

  // Heatmap
  // Heatmap (fills card)
function renderHeatmap(){
  const wrap = $('#heatmapContainer'); if (!wrap) return;
  const cols = 53, rows = 7;
  const grid = document.createElement('div'); grid.className='hm-grid';
  for (let c=0;c<cols;c++){
    const col = document.createElement('div'); col.className='hm-col';
    for (let r=0;r<rows;r++){
      const cell = document.createElement('div'); cell.className='hm-cell';
      const v = Math.random();
      if (v>0.8) cell.classList.add('l4'); else if (v>0.6) cell.classList.add('l3'); else if (v>0.35) cell.classList.add('l2'); else if (v>0.18) cell.classList.add('l1');
      col.appendChild(cell);
    }
    grid.appendChild(col);
  }
  wrap.innerHTML=''; wrap.appendChild(grid);
  fitHeatmap();
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


  // To-do (local only)
  const todoKey = 'ems.todo';
  function loadTodos(){
    const list = $('#todoList'); if(!list) return;
    const data = JSON.parse(localStorage.getItem(todoKey)||'[]');
    list.innerHTML = data.map((t,i)=>`
      <li data-i="${i}">
        <input type="checkbox" ${t.done?'checked':''}>
        <span>${t.text}</span>
        <button class="rm" title="Remove"><i class="fa-regular fa-trash-can"></i></button>
      </li>`).join('');

    list.querySelectorAll('input[type="checkbox"]').forEach(cb=>{
      cb.addEventListener('change',e=>{
        const i = +e.target.closest('li').dataset.i;
        data[i].done = e.target.checked;
        localStorage.setItem(todoKey, JSON.stringify(data));
      });
    });

    list.querySelectorAll('.rm').forEach(btn=>{
      btn.addEventListener('click',e=>{
        const i = +e.currentTarget.closest('li').dataset.i;
        data.splice(i,1);
        localStorage.setItem(todoKey, JSON.stringify(data));
        loadTodos();
        syncHeights();
      });
    });
  }

  $('#addTodo')?.addEventListener('click',()=>{
    const text = prompt('New to-do'); if(!text) return;
    const data = JSON.parse(localStorage.getItem(todoKey)||'[]');
    data.unshift({text,done:false});
    localStorage.setItem(todoKey, JSON.stringify(data));
    loadTodos();
    syncHeights();
  });

  function syncHeights(){
    const isDesktop = window.innerWidth > 1200;
    const root = document.documentElement;
    const perf = $('#cardPerformance');
    const acts = $('#cardActions');
    const cal  = $('#cardCalendar');
    const todo = $('#cardTodo');
    const todoList = $('#todoList');
    const todoHeader = $('#cardTodo .card-header');
    const contrib = $('#cardContribution');
  
    if(!isDesktop){
      ['--calH','--contribH','--todoBodyH'].forEach(v=>root.style.removeProperty(v));
      [perf, acts, cal, todo].forEach(el=>{ if(el){ el.style.height=''; el.style.minHeight=''; }});
      if(todoList){ todoList.style.height=''; todoList.style.overflowY=''; }
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
  
    // 2) To‑do equals Contribution; body scrolls
    if (contrib && todo && todoHeader && todoList) {
      const contribH = Math.ceil(contrib.getBoundingClientRect().height);
      root.style.setProperty('--contribH', contribH + 'px');
      todo.style.height = contribH + 'px';
  
      const cs = getComputedStyle(todo);
      const padV = (parseFloat(cs.paddingTop)||0)+(parseFloat(cs.paddingBottom)||0);
      const borderV = (parseFloat(cs.borderTopWidth)||0)+(parseFloat(cs.borderBottomWidth)||0);
      const headerH = Math.ceil(todoHeader.getBoundingClientRect().height);
      const bodyH = Math.max(0, contribH - headerH - padV - borderV);
  
      root.style.setProperty('--todoBodyH', bodyH + 'px');
      todoList.style.height = bodyH + 'px';
      todoList.style.overflowY = 'auto';
    }
    fitHeatmap();
  }  

  const debounce = (fn,ms=120)=>{ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; };

  // Boot
  document.addEventListener('DOMContentLoaded', () => {
    console.log('Dashboard loaded, initializing calendar...');
    console.log('Current user events data:', window.DASHBOARD_EVENTS);
    
    // Add test event for debugging
    if (!window.DASHBOARD_EVENTS || window.DASHBOARD_EVENTS.length === 0) {
      console.log('No events found, adding test event for debugging...');
      window.DASHBOARD_EVENTS = [{
        id: 999,
        title: 'Test Event',
        date: '2025-08-13',
        time: '14:30',
        venue: 'Test Location',
        event_focus_type: 'Test',
        description: 'Test event for debugging'
      }];
    }
    
    loadPerformance();
    loadCalendarEvents(); // Changed from buildCalendar to load all events first
    renderHeatmap();
    loadTodos();
    requestAnimationFrame(()=>{ syncHeights(); });
  });

  window.addEventListener('load', ()=>syncHeights());
  window.addEventListener('resize', debounce(syncHeights, 150));
})();
