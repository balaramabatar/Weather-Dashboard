// Step A: You will need to replace this string with your actual API key from OpenWeatherMap
const apiKey = 'ef75ab0b22d7e108b75fda1dae3f1de4'; 

let weatherChart = null;
let map = null;
let radarLayer = null;
let recentSearches = JSON.parse(localStorage.getItem('recent-cities')) || [];

document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    renderRecent();
    initParticles("#64748b", 0.8);
    VanillaTilt.init(document.querySelector(".card"), { max: 8, speed: 400, glare: true, "max-glare": 0.2 });
    
    // Support for Enter Key
    document.getElementById('cityInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') checkWeather();
    });
});

// Sidebar Controls
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

function addToRecent(city) {
    if (!recentSearches.includes(city)) {
        recentSearches.unshift(city);
        if (recentSearches.length > 6) recentSearches.pop();
        localStorage.setItem('recent-cities', JSON.stringify(recentSearches));
        renderRecent();
    }
}

function renderRecent() {
    const list = document.getElementById('recentList');
    list.innerHTML = recentSearches.map(city => `<li onclick="fetchWeather('${city}')">${city}</li>`).join('');
}

// Theme Engine
function initTheme() {
    const saved = localStorage.getItem('user-theme') || (new Date().getHours() < 6 || new Date().getHours() > 18 ? 'dark' : 'light');
    setTheme(saved);
}

function setTheme(mode) {
    document.documentElement.setAttribute('data-theme', mode);
    document.getElementById('themeToggle').innerText = mode === 'light' ? '🌙' : '☀️';
}

document.getElementById('themeToggle').addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('user-theme', next);
});

async function updateSensoryTheme(temp) {
    const card = document.querySelector('.card');
    let accent, speed;
    if (temp >= 30) { accent = "#f59e0b"; speed = 1.8; }
    else if (temp <= 15) { accent = "#3b82f6"; speed = 0.5; }
    else { accent = "#10b981"; speed = 1.0; }
    card.style.setProperty('--accent', accent);
    initParticles(accent, speed);
}

async function initParticles(color, speed) {
    await tsParticles.load("tsparticles", {
        particles: {
            number: { value: 70 },
            color: { value: color },
            links: { enable: true, distance: 150, color: color, opacity: 0.3 },
            move: { enable: true, speed: speed, outModes: "out" },
            size: { value: { min: 1, max: 3 } }
        },
        interactivity: { events: { onHover: { enable: true, mode: "grab" } }, modes: { grab: { distance: 200, links: { opacity: 0.6 } } } }
    });
}

// Weather Core
function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(p => fetchWeather(null, p.coords.latitude, p.coords.longitude));
    }
}

async function checkWeather() {
    const city = document.getElementById('cityInput').value;
    if (city) fetchWeather(city);
}

async function fetchWeather(city, lat = null, lon = null) {
    const loader = document.getElementById('loadingSpinner');
    const info = document.getElementById('weatherInfo');
    const err = document.getElementById('error');
    
    loader.style.display = 'block';
    err.style.display = 'none';

    try {
        let url = city ? `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric` 
                       : `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
        
        const res = await fetch(url);
        if(!res.ok) throw new Error("Not Found");
        const data = await res.json();

        // Switch UI State
        document.body.classList.add('active-state');
        addToRecent(data.name);

        setTimeout(async () => {
            updateSensoryTheme(data.main.temp);
            document.getElementById('cityName').innerText = data.name;
            document.getElementById('temp').innerText = `${Math.round(data.main.temp)}°C`;
            document.getElementById('description').innerText = data.weather[0].main;
            document.getElementById('humidity').innerText = `Humidity: ${data.main.humidity}%`;
            
            document.getElementById('windSpeed').innerText = `${data.wind.speed} m/s`;
            document.getElementById('feelsLike').innerText = `${Math.round(data.main.feels_like)}°C`;
            document.getElementById('sunriseTime').innerText = new Date(data.sys.sunrise * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

            const coords = [data.coord.lat, data.coord.lon];
            if (!map) {
                map = L.map('map').setView(coords, 10);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
            } else { map.setView(coords, 10); }
            if (radarLayer) map.removeLayer(radarLayer);
            radarLayer = L.tileLayer(`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${apiKey}`).addTo(map);
            map.eachLayer(l => { if(l instanceof L.Marker) map.removeLayer(l); });
            L.marker(coords).addTo(map);

            const fRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${data.coord.lat}&lon=${data.coord.lon}&appid=${apiKey}&units=metric`);
            const fData = await fRes.json();
            drawChart(fData);

            loader.style.display = 'none';
            info.style.display = 'flex';
            setTimeout(() => map.invalidateSize(), 200);
        }, 600);

    } catch (e) {
        loader.style.display = 'none';
        err.style.display = 'block';
        setTimeout(() => err.style.display = 'none', 3000);
    }
}

function drawChart(data) {
    const daily = data.list.filter(i => i.dt_txt.includes('12:00:00'));
    const labels = daily.map(i => new Date(i.dt_txt).toLocaleDateString('en-US',{weekday:'short'}));
    const temps = daily.map(i => Math.round(i.main.temp));

    if (weatherChart) weatherChart.destroy();
    weatherChart = new Chart(document.getElementById('forecastChart'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{ data: temps, borderColor: '#3b82f6', tension: 0.4, fill: true, backgroundColor: 'rgba(59,130,246,0.1)' }]
        },
        options: { plugins: { legend: { display: false } }, scales: { y: { display: false }, x: { ticks: { color: '#94a3b8' } } } }
    });
}