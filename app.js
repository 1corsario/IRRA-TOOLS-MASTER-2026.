
'use strict';

const content = document.getElementById('content');
const search = document.getElementById('search');
const toast = document.getElementById('toast');

let currentView = 'inicio';
let currentTool = '';
let qrLibraryPromise = null;

function loadList(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

let recentTools = loadList('irraRecent');
let favorites = loadList('irraFavorites');

const categories = [
  {
    id: 'documentos',
    name: 'Documentos',
    subtitle: 'Gestiona tus archivos fácilmente',
    icon: '▤',
    color: '#22d7ff',
    color2: '#006dbb',
    items: [
      'Unir, dividir y comprimir PDF',
      'Reordenar, girar y eliminar páginas',
      'Convertir imágenes a PDF',
      'Organizar archivos'
    ],
    tools: [
      ['images-pdf', 'Imágenes a PDF', 'Selecciona imágenes y prepara un PDF.'],
      ['text-file', 'Texto a archivo', 'Guarda texto como archivo TXT.']
    ]
  },
  {
    id: 'imagenes',
    name: 'Imágenes',
    subtitle: 'Edita y optimiza tus fotos',
    icon: '▧',
    color: '#c58aff',
    color2: '#5d25d9',
    items: [
      'Convertir entre formatos',
      'Redimensionar y comprimir',
      'Consultar dimensiones y peso',
      'Preparar imágenes para documentos'
    ],
    tools: [
      ['image-resize', 'Redimensionar imagen', 'Cambia el tamaño de una imagen en tu navegador.'],
      ['image-info', 'Información de imagen', 'Consulta dimensiones, formato y peso.']
    ]
  },
  {
    id: 'dinero',
    name: 'Dinero',
    subtitle: 'Calcula, ahorra, decide',
    icon: '▦',
    color: '#3af0bf',
    color2: '#008a72',
    items: [
      'Calcular IVA y descuentos',
      'Porcentajes, propinas y repartos',
      'Control de gastos e ingresos',
      'Cuotas y comparativas de precios'
    ],
    tools: [
      ['vat', 'Calculadora de IVA', 'Calcula el IVA que debes añadir a un importe.'],
      ['discount', 'Calculadora de descuentos', 'Calcula el precio después del descuento.'],
      ['percentage', 'Porcentajes', 'Calcula qué porcentaje representa una cantidad.']
    ]
  },
  {
    id: 'vida',
    name: 'Vida diaria',
    subtitle: 'Organiza tu tiempo y tu hogar',
    icon: '▣',
    color: '#ffb52e',
    color2: '#9d5c00',
    items: [
      'Listas de compra y tareas',
      'Inventarios domésticos',
      'Organizadores y calendarios',
      'Presupuestos familiares y viajes'
    ],
    tools: [
      ['checklist', 'Lista de tareas', 'Crea tareas y marca las completadas.'],
      ['budget', 'Presupuesto sencillo', 'Compara ingresos y gastos.']
    ]
  },
  {
    id: 'trabajo',
    name: 'Trabajo',
    subtitle: 'Aumenta tu productividad',
    icon: '▰',
    color: '#21cfff',
    color2: '#0055b9',
    items: [
      'Crear presupuestos y facturas',
      'Plantillas para autónomos y empresas',
      'Generar documentos imprimibles',
      'Cálculo de precios y márgenes'
    ],
    tools: [
      ['quote', 'Generador de presupuesto', 'Prepara un presupuesto imprimible.']
    ]
  },
  {
    id: 'privacidad',
    name: 'Privacidad',
    subtitle: 'Tus archivos, en tus manos',
    icon: '⬡',
    color: '#c47bff',
    color2: '#6418cc',
    items: [
      'Procesamiento local cuando sea posible',
      'Generador de contraseñas',
      'Códigos QR',
      'Conversores y limpieza de archivos'
    ],
    tools: [
      ['password', 'Generador de contraseñas', 'Genera contraseñas aleatorias en tu dispositivo.'],
      ['qr', 'Código QR', 'Genera un QR a partir de un texto o enlace.']
    ]
  }
];

const allTools = categories.flatMap(category =>
  category.tools.map(tool => ({
    id: tool[0],
    name: tool[1],
    desc: tool[2],
    category: category.id
  }))
);

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function notify(message) {
  if (!toast) {
    alert(message);
    return;
  }

  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(notify.timer);

  notify.timer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2800);
}

function saveLists() {
  try {
    localStorage.setItem('irraRecent', JSON.stringify(recentTools));
    localStorage.setItem('irraFavorites', JSON.stringify(favorites));
  } catch {
    notify('No se pudieron guardar los cambios en este navegador.');
  }
}

function recordTool(id) {
  recentTools = [id, ...recentTools.filter(item => item !== id)].slice(0, 12);
  saveLists();
}

function number(id) {
  const element = document.getElementById(id);
  if (!element) return 0;

  const value = Number(element.value);
  return Number.isFinite(value) ? value : 0;
}

function money(value) {
  return value.toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR'
  });
}

function card(category) {
  return `
    <article class="category-card"
      style="--accent:${category.color};--accent2:${category.color2}">
      <div class="category-top">
        <div class="category-icon">${category.icon}</div>
        <div>
          <h3>${category.name}</h3>
          <div class="subtitle">${category.subtitle}</div>
        </div>
      </div>
      <ul>
        ${category.items.map(item => `<li>${item}</li>`).join('')}
      </ul>
      <button class="action-button" data-category="${category.id}">
        Ver herramientas <span>→</span>
      </button>
    </article>
  `;
}

function setActiveNav(view) {
  document.querySelectorAll('.nav-item').forEach(button => {
    button.classList.toggle('active', button.dataset.view === view);
  });
}

function renderHome(filter = '') {
  currentView = 'inicio';
  setActiveNav('inicio');

  const query = filter.trim().toLocaleLowerCase('es');
  const list = categories.filter(category =>
    [
      category.name,
      category.subtitle,
      ...category.items,
      ...category.tools.flat()
    ].join(' ').toLocaleLowerCase('es').includes(query)
  );

  content.innerHTML = `
    <section class="hero">
      <div class="hero-copy">
        <div class="eyebrow">Tu centro de utilidades digitales</div>
        <h1><span>IRRA-TOOLS</span><br>MASTER</h1>
        <p>La caja de herramientas digitales para todos</p>
        <div class="hero-pills">
          <span><b>ϟ</b> Rápido</span>
          <span><b>⬡</b> Privado</span>
          <span><b>∞</b> Sin suscripciones</span>
          <span><b>☁</b> Siempre contigo</span>
        </div>
        <div class="free-badge">
          <strong>UTILIDADES DIGITALES</strong>
          Sin suscripciones dentro de la aplicación
        </div>
      </div>
      <div class="hero-visual">
        <div class="orbit">
          <div class="orbital-icon">⚙</div>
          <div class="orbit-caption">
            HERRAMIENTAS SIMPLES · SOLUCIONES REALES
          </div>
        </div>
      </div>
    </section>

    <div class="section-heading">
      <div>
        <h2>${query ? 'Resultados de búsqueda' : 'Todas tus herramientas'}</h2>
        <p>${query
          ? `Coincidencias para «${escapeHtml(filter)}»`
          : 'Utilidades prácticas en un solo lugar'}</p>
      </div>
      <span class="eyebrow">${list.length} CATEGORÍAS</span>
    </div>

    <section class="category-grid">
      ${list.map(card).join('') || `
        <div class="empty-state">
          <strong>No encontramos esa herramienta</strong>
          Prueba con otra palabra.
        </div>
      `}
    </section>
  `;
}

function renderCategory(id) {
  const category = categories.find(item => item.id === id);
  if (!category) return renderHome();

  currentView = id;
  setActiveNav(id);

  content.innerHTML = `
    <section class="tool-page">
      <button class="back-link" data-view="inicio">← Volver al inicio</button>
      <div class="eyebrow">IRRA-TOOLS MASTER / HERRAMIENTAS</div>
      <h1 style="color:${category.color}">
        ${category.icon} ${category.name}
      </h1>
      <p class="intro">${category.subtitle}. Selecciona una utilidad para empezar.</p>
      <div class="quick-list">
        ${category.tools.map(tool => `
          <button class="quick-tool" data-tool="${tool[0]}">
            <strong>${tool[1]}</strong>
            <small>${tool[2]}</small>
          </button>
        `).join('')}
      </div>
    </section>
  `;
}

function field(label, id, placeholder = '', type = 'text', value = '') {
  return `
    <label class="field">
      ${label}
      <input id="${id}" type="${type}"
        placeholder="${escapeHtml(placeholder)}"
        value="${escapeHtml(value)}">
    </label>
  `;
}

function panel(title, body) {
  return `<section class="tool-panel"><h3>${title}</h3>${body}</section>`;
}

function renderTool(id) {
  const tool = allTools.find(item => item.id === id);
  if (!tool) return;

  currentTool = id;
  currentView = 'tool';
  recordTool(id);
  setActiveNav(tool.category);

  let body = '';

  if (id === 'vat') {
    body = panel('Calculadora de IVA', `
      ${field('Importe base (€)', 'vatAmount', '100', 'number', '100')}
      ${field('Tipo de IVA (%)', 'vatRate', '21', 'number', '21')}
      <button class="action-button" data-action="vat">Calcular <span>→</span></button>
      <div class="result" id="vatResult">Introduce los importes y calcula el resultado.</div>
    `);
  }

  if (id === 'discount') {
    body = panel('Calculadora de descuentos', `
      ${field('Precio original (€)', 'discountPrice', '100', 'number', '100')}
      ${field('Descuento (%)', 'discountRate', '15', 'number', '15')}
      <button class="action-button" data-action="discount">Calcular precio <span>→</span></button>
      <div class="result" id="discountResult">El precio final aparecerá aquí.</div>
    `);
  }

  if (id === 'percentage') {
    body = panel('Calculadora de porcentajes', `
      ${field('Cantidad', 'partAmount', '25', 'number', '25')}
      ${field('Total', 'wholeAmount', '200', 'number', '200')}
      <button class="action-button" data-action="percentage">Calcular porcentaje <span>→</span></button>
      <div class="result" id="percentageResult">El porcentaje aparecerá aquí.</div>
    `);
  }

  if (id === 'password') {
    body = panel('Generador de contraseñas', `
      ${field('Longitud (8–64)', 'passLength', '20', 'number', '20')}
      <label class="field">
        <span><input id="passSymbols" type="checkbox" checked style="width:auto">
        Incluir símbolos</span>
      </label>
      <button class="action-button" data-action="password">Generar contraseña <span>↻</span></button>
      <div class="result" id="passwordResult">Tu contraseña aparecerá aquí.</div>
      <button class="action-button" data-action="copyPassword" style="margin-top:10px">
        Copiar contraseña <span>▣</span>
      </button>
    `);
  }

  if (id === 'text-file') {
    body = panel('Texto a archivo TXT', `
      <label class="field">Contenido
        <textarea id="textContent" rows="7" placeholder="Escribe o pega tu texto aquí..."></textarea>
      </label>
      ${field('Nombre del archivo', 'textFilename', 'mi-documento', 'text', 'mi-documento')}
      <button class="action-button" data-action="textFile">Descargar TXT <span>↓</span></button>
    `);
  }

  if (id === 'images-pdf') {
    body = panel('Imágenes a PDF', `
      <p>Selecciona imágenes. Se abrirá la ventana de impresión para guardarlas como PDF.</p>
      <label class="field">Imágenes
        <input id="pdfImages" type="file" accept="image/*" multiple>
      </label>
      <button class="action-button" data-action="imagesPdf">Preparar PDF <span>→</span></button>
      <div class="result">El navegador prepara las imágenes. Debes elegir «Guardar como PDF».</div>
    `);
  }

  if (id === 'image-info') {
    body = panel('Información de imagen', `
      <label class="field">Selecciona una imagen
        <input id="infoImage" type="file" accept="image/*">
      </label>
      <div class="result" id="imageInfoResult">Se mostrarán formato, tamaño y dimensiones.</div>
    `);
  }

  if (id === 'image-resize') {
    body = panel('Redimensionar imagen', `
      <label class="field">Selecciona imagen
        <input id="resizeImage" type="file" accept="image/*">
      </label>
      ${field('Ancho máximo (px)', 'resizeWidth', '1200', 'number', '1200')}
      ${field('Nombre de salida', 'resizeName', 'imagen-reducida', 'text', 'imagen-reducida')}
      <button class="action-button" data-action="resizeImage">Redimensionar y descargar <span>↓</span></button>
      <div class="result" id="resizeResult">La imagen se procesa en tu navegador.</div>
    `);
  }

  if (id === 'checklist') {
    body = panel('Lista de tareas', `
      <form id="taskForm" class="field">
        <span>Nueva tarea</span>
        <input id="taskInput" placeholder="Ej. Comprar leche" required>
        <button class="action-button" type="submit">Añadir tarea <span>＋</span></button>
      </form>
      <div id="taskList"></div>
      <button class="action-button" data-action="clearTasks">Borrar tareas completadas</button>
    `);
  }

  if (id === 'budget') {
    body = panel('Presupuesto sencillo', `
      ${field('Ingresos (€)', 'budgetIncome', '1800', 'number', '1800')}
      ${field('Gastos (€)', 'budgetExpenses', '1250', 'number', '1250')}
      <button class="action-button" data-action="budget">Calcular saldo <span>→</span></button>
      <div class="result" id="budgetResult">Introduce tus ingresos y gastos.</div>
    `);
  }

  if (id === 'quote') {
    body = panel('Generador de presupuesto', `
      ${field('Nombre del profesional/empresa', 'quoteCompany', 'Tu nombre o empresa')}
      ${field('Cliente', 'quoteClient', 'Nombre del cliente')}
      ${field('Descripción del trabajo', 'quoteDesc', 'Describe el servicio')}
      ${field('Importe sin IVA (€)', 'quoteAmount', '250', 'number', '250')}
      ${field('IVA (%)', 'quoteVat', '21', 'number', '21')}
      <button class="action-button" data-action="quote">Vista imprimible / Guardar PDF <span>↗</span></button>
      <p>Se abrirá una vista de impresión. Puedes elegir «Guardar como PDF».</p>
      <p>Plantilla orientativa; no sustituye una factura legal completa.</p>
    `);
  }

  if (id === 'qr') {
    body = panel('Código QR', `
      ${field('Texto o enlace', 'qrText', 'https://ejemplo.com', 'text', 'https://ejemplo.com')}
      <button class="action-button" data-action="qr">Crear código QR <span>→</span></button>
      <div id="qrResult" class="result">Escribe un texto o enlace para crear el QR.</div>
      <div id="qrCanvas" style="margin-top:18px;overflow-wrap:anywhere"></div>
      <button class="action-button" data-action="downloadQr" style="margin-top:12px">
        Descargar QR PNG <span>↓</span>
      </button>
      <p>La primera vez necesita conexión a Internet para cargar la biblioteca QR. El texto se procesa en el navegador; no se envía a una API de generación de QR.</p>
    `);
  }

  const isFavorite = favorites.includes(id);

  content.innerHTML = `
    <section class="tool-page">
      <button class="back-link" data-view="${tool.category}">
        ← Volver a ${categories.find(item => item.id === tool.category).name}
      </button>
      <div class="tool-title-row">
        <div class="eyebrow">HERRAMIENTA</div>
        <button class="action-button" data-action="toggleFavorite" aria-pressed="${isFavorite}">
          ${isFavorite ? '★ Quitar de favoritos' : '☆ Añadir a favoritos'}
        </button>
      </div>
      <h1>${tool.name}</h1>
      <p class="intro">${tool.desc}</p>
      <div class="tool-grid">
        ${body}
        ${panel('Consejo de privacidad', `
          <p>Los archivos seleccionados para las herramientas compatibles se procesan en tu navegador.
          No uses equipos compartidos para información confidencial.</p>
        `)}
      </div>
    </section>
  `;

  if (id === 'checklist') renderTasks();

  if (id === 'image-info') {
    document.getElementById('infoImage').addEventListener('change', showImageInfo);
  }
}

function renderTasks() {
  const host = document.getElementById('taskList');
  if (!host) return;

  const tasks = loadList('irraTasks');

  host.innerHTML = tasks.map((task, index) => `
    <label class="field" style="display:flex;align-items:center;gap:9px">
      <input type="checkbox" data-task="${index}" ${task.done ? 'checked' : ''} style="width:auto">
      <span style="${task.done ? 'text-decoration:line-through;opacity:.6' : ''}">
        ${escapeHtml(task.text)}
      </span>
      <button type="button" data-delete-task="${index}" aria-label="Eliminar tarea">×</button>
    </label>
  `).join('') || '<p class="intro">Aún no hay tareas.</p>';
}

function showImageInfo(event) {
  const file = event.target.files[0];
  const result = document.getElementById('imageInfoResult');
  if (!file || !result) return;

  const url = URL.createObjectURL(file);
  const img = new Image();

  img.onload = () => {
    result.textContent =
      `${file.name} · ${(file.size / 1024).toFixed(1)} KB · ` +
      `${img.naturalWidth} × ${img.naturalHeight} px · ${file.type || 'formato desconocido'}`;
    URL.revokeObjectURL(url);
  };

  img.onerror = () => {
    result.textContent = 'No se pudo leer esta imagen.';
    URL.revokeObjectURL(url);
  };

  img.src = url;
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function safeFilename(value, fallback) {
  const name = String(value || fallback)
    .trim()
    .replace(/[^\w\-áéíóúüñ]/gi, '_')
    .slice(0, 100);

  return name || fallback;
}

function printImages(files) {
  if (!files.length) {
    notify('Selecciona al menos una imagen.');
    return;
  }

  if (files.some(file => !file.type.startsWith('image/'))) {
    notify('Selecciona únicamente archivos de imagen.');
    return;
  }

  const urls = files.map(file => URL.createObjectURL(file));
  const win = window.open('', '_blank');

  if (!win) {
    urls.forEach(URL.revokeObjectURL);
    notify('Permite las ventanas emergentes para continuar.');
    return;
  }

  const images = urls.map(url =>
    `<img src="${url}" alt="Imagen para PDF">`
  ).join('');

  win.document.write(`
    <!doctype html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <title>Imágenes a PDF</title>
      <style>
        body{margin:0;font-family:Arial,sans-serif}
        img{display:block;max-width:96%;max-height:96vh;margin:2vh auto;object-fit:contain;page-break-after:always}
        @media print{img{max-height:96vh;page-break-after:always}}
      </style>
    </head>
    <body>
      ${images}
      <script>
        window.onload = () => setTimeout(() => window.print(), 500);
        window.onafterprint = () => window.close();
      <\/script>
    </body>
    </html>
  `);

  win.document.close();

  setTimeout(() => urls.forEach(URL.revokeObjectURL), 60000);
}

function resizeImageNow() {
  const input = document.getElementById('resizeImage');
  const file = input?.files[0];

  if (!file) {
    notify('Selecciona una imagen primero.');
    return;
  }

  const maxWidth = Math.min(12000, Math.max(1, number('resizeWidth') || 1200));
  const url = URL.createObjectURL(file);
  const img = new Image();

  img.onload = () => {
    const ratio = Math.min(1, maxWidth / img.naturalWidth);
    const canvas = document.createElement('canvas');

    canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio));

    const context = canvas.getContext('2d');

    if (!context) {
      URL.revokeObjectURL(url);
      notify('No se pudo procesar la imagen.');
      return;
    }

    context.drawImage(img, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(blob => {
      URL.revokeObjectURL(url);

      if (!blob) {
        notify('No se pudo crear el archivo.');
        return;
      }

      const name = safeFilename(
        document.getElementById('resizeName').value,
        'imagen-reducida'
      );

      downloadBlob(blob, `${name}.png`);

      const result = document.getElementById('resizeResult');
      if (result) {
        result.textContent =
          `Listo: ${canvas.width} × ${canvas.height} px. Archivo PNG descargado.`;
      }
    }, 'image/png');
  };

  img.onerror = () => {
    URL.revokeObjectURL(url);
    notify('No se pudo abrir esa imagen.');
  };

  img.src = url;
}

function loadQrLibrary() {
  if (window.QRCode) return Promise.resolve();

  if (qrLibraryPromise) return qrLibraryPromise;

  qrLibraryPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');

    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    script.async = true;

    script.onload = () => {
      if (window.QRCode) resolve();
      else reject(new Error('No se encontró la biblioteca QR.'));
    };

    script.onerror = () => {
      qrLibraryPromise = null;
      reject(new Error('No se pudo descargar la biblioteca QR.'));
    };

    document.head.appendChild(script);
  });

  return qrLibraryPromise;
}

async function createQr() {
  const input = document.getElementById('qrText');
  const result = document.getElementById('qrResult');
  const host = document.getElementById('qrCanvas');

  const value = input?.value.trim();

  if (!value) {
    notify('Escribe un texto o enlace.');
    return;
  }

  if (value.length > 2000) {
    notify('El texto es demasiado largo para esta herramienta.');
    return;
  }

  result.textContent = 'Preparando el código QR…';
  host.replaceChildren();

  try {
    await loadQrLibrary();

    new window.QRCode(host, {
      text: value,
      width: 256,
      height: 256,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: window.QRCode.CorrectLevel.M
    });

    result.textContent = 'Código QR creado. Puedes descargarlo como PNG.';
  } catch {
    result.textContent =
      'No se pudo cargar el generador QR. Comprueba la conexión a Internet e inténtalo de nuevo.';
    notify('No se pudo generar el QR.');
  }
}

function downloadQr() {
  const host = document.getElementById('qrCanvas');
  if (!host) return;

  const canvas = host.querySelector('canvas');
  const image = host.querySelector('img');

  if (canvas) {
    canvas.toBlob(blob => {
      if (blob) downloadBlob(blob, 'irra-tools-qr.png');
      else notify('No se pudo descargar el QR.');
    }, 'image/png');
    return;
  }

  if (image?.src) {
    const link = document.createElement('a');
    link.href = image.src;
    link.download = 'irra-tools-qr.png';
    link.click();
    return;
  }

  notify('Primero debes crear un código QR.');
}

function toggleFavorite() {
  if (!currentTool) return;

  if (favorites.includes(currentTool)) {
    favorites = favorites.filter(id => id !== currentTool);
    notify('Herramienta eliminada de favoritos.');
  } else {
    favorites = [currentTool, ...favorites.filter(id => id !== currentTool)];
    notify('Herramienta añadida a favoritos.');
  }

  saveLists();
  renderTool(currentTool);
}

function renderSaved(kind) {
  currentView = kind;
  setActiveNav(kind);

  const ids = kind === 'favoritos' ? favorites : recentTools;
  const items = ids.map(id => allTools.find(tool => tool.id === id)).filter(Boolean);

  content.innerHTML = `
    <section class="tool-page">
      <div class="eyebrow">PERSONALIZACIÓN</div>
      <h1>${kind === 'favoritos' ? '☆ Favoritos' : '◷ Herramientas recientes'}</h1>
      <p class="intro">
        ${kind === 'favoritos'
          ? 'Accede rápidamente a tus herramientas preferidas.'
          : 'Tus últimas herramientas utilizadas.'}
      </p>
      <div class="quick-list">
        ${items.map(tool => `
          <div class="quick-tool">
            <button data-tool="${tool.id}" style="width:100%;text-align:left">
              <strong>${tool.name}</strong>
              <small>${tool.desc}</small>
            </button>
            ${kind === 'favoritos' ? `
              <button data-remove-favorite="${tool.id}" aria-label="Quitar de favoritos">★ Quitar</button>
            ` : ''}
          </div>
        `).join('') || `
          <div class="empty-state">
            <strong>${kind === 'favoritos' ? 'Todavía no tienes favoritos' : 'Todavía no hay herramientas recientes'}</strong>
            ${kind === 'favoritos'
              ? 'Abre una herramienta y pulsa «Añadir a favoritos».'
              : 'Cuando utilices herramientas, aparecerán aquí.'}
          </div>
        `}
      </div>
    </section>
  `;
}

function renderSimple(view) {
  currentView = view;
  setActiveNav(view);

  content.innerHTML = `
    <section class="tool-page">
      <div class="eyebrow">IRRA-TOOLS MASTER</div>
      <h1>${view === 'ajustes' ? '⚙ Ajustes' : 'ⓘ Acerca de'}</h1>
      ${view === 'ajustes' ? `
        <p class="intro">Personaliza tu experiencia.</p>
        <div class="tool-grid">
          ${panel('Apariencia', `
            <p>Cambia entre el tema oscuro y el claro.</p>
            <button class="action-button" data-action="theme">Cambiar tema <span>◐</span></button>
          `)}
          ${panel('Datos locales', `
            <p>Las listas, los favoritos y las herramientas recientes se guardan en este navegador.</p>
            <button class="action-button" data-action="clearLocal">Borrar datos locales <span>×</span></button>
          `)}
        </div>
      ` : `
        ${panel('Una caja de herramientas para todos', `
          <p>IRRA-TOOLS MASTER reúne utilidades digitales sencillas.</p>
          <p><b>Creado por Irra Anaya</b></p>
          <p>Versión 1.1</p>
        `)}
      `}
    </section>
  `;
}

function toggleTheme() {
  document.body.classList.toggle('light');

  try {
    localStorage.setItem(
      'irraTheme',
      document.body.classList.contains('light') ? 'light' : 'dark'
    );
  } catch {}

  const button = document.getElementById('themeToggle');
  if (button) {
    button.textContent = document.body.classList.contains('light') ? '☀' : '☾';
  }
}

function restoreTheme() {
  try {
    if (localStorage.getItem('irraTheme') === 'light') {
      document.body.classList.add('light');
    }
  } catch {}

  const button = document.getElementById('themeToggle');
  if (button) {
    button.textContent = document.body.classList.contains('light') ? '☀' : '☾';
  }
}

function validPercentage(value) {
  return value >= 0 && value <= 100;
}

function printQuote() {
  const company = document.getElementById('quoteCompany').value.trim() || 'Profesional';
  const client = document.getElementById('quoteClient').value.trim() || 'Cliente';
  const description = document.getElementById('quoteDesc').value.trim() || 'Servicio';
  const amount = number('quoteAmount');
  const vat = number('quoteVat');

  if (amount < 0 || vat < 0 || vat > 100) {
    notify('Comprueba el importe y el IVA.');
    return;
  }

  const total = amount * (1 + vat / 100);
  const win = window.open('', '_blank');

  if (!win) {
    notify('Permite las ventanas emergentes para imprimir.');
    return;
  }

  win.document.write(`
    <!doctype html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <title>Presupuesto</title>
      <style>
        body{font:16px Arial;max-width:800px;margin:50px auto;color:#172b3b;padding:0 20px}
        h1{color:#007fa8}
        table{width:100%;border-collapse:collapse;margin-top:30px}
        td,th{padding:14px;border-bottom:1px solid #ddd;text-align:left}
        .total{text-align:right;font-size:22px;font-weight:bold;margin-top:25px}
      </style>
    </head>
    <body>
      <h1>PRESUPUESTO</h1>
      <p><b>Emisor:</b> ${escapeHtml(company)}</p>
      <p><b>Cliente:</b> ${escapeHtml(client)}</p>
      <table>
        <tr><th>Descripción</th><th>Base</th><th>IVA</th><th>Total</th></tr>
        <tr>
          <td>${escapeHtml(description)}</td>
          <td>${money(amount)}</td>
          <td>${vat}%</td>
          <td>${money(total)}</td>
        </tr>
      </table>
      <p class="total">Total: ${money(total)}</p>
      <p>Documento orientativo. Comprueba los datos y los requisitos legales antes de utilizarlo.</p>
      <script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script>
    </body>
    </html>
  `);

  win.document.close();
}

/*
  CORRECCIÓN PRINCIPAL:
  El listener está en document, no solo en #content.
  Así recibe también los clics del menú lateral.
*/
document.addEventListener('click', async event => {
  const nav = event.target.closest('[data-view]');

  if (nav) {
    const view = nav.dataset.view;
    search.value = '';

    if (view === 'inicio') renderHome();
    else if (view === 'favoritos' || view === 'recientes') renderSaved(view);
    else if (view === 'ajustes' || view === 'acerca') renderSimple(view);
    else renderCategory(view);

    return;
  }

  const category = event.target.closest('[data-category]');
  if (category) {
    renderCategory(category.dataset.category);
    return;
  }

  const toolButton = event.target.closest('[data-tool]');
  if (toolButton) {
    renderTool(toolButton.dataset.tool);
    return;
  }

  const removeFavorite = event.target.closest('[data-remove-favorite]');
  if (removeFavorite) {
    favorites = favorites.filter(id => id !== removeFavorite.dataset.removeFavorite);
    saveLists();
    renderSaved('favoritos');
    notify('Favorito eliminado.');
    return;
  }

  const deleteTask = event.target.closest('[data-delete-task]');
  if (deleteTask) {
    const tasks = loadList('irraTasks');
    tasks.splice(Number(deleteTask.dataset.deleteTask), 1);

    try {
      localStorage.setItem('irraTasks', JSON.stringify(tasks));
    } catch {}

    renderTasks();
    return;
  }

  const actionButton = event.target.closest('[data-action]');
  const action = actionButton?.dataset.action;
  if (!action) return;

  if (action === 'toggleFavorite') toggleFavorite();

  if (action === 'vat') {
    const amount = number('vatAmount');
    const rate = number('vatRate');

    if (amount < 0 || rate < 0 || rate > 100) {
      notify('Introduce importes válidos y un IVA entre 0 y 100%.');
      return;
    }

    document.getElementById('vatResult').textContent =
      `Base: ${money(amount)} · IVA: ${money(amount * rate / 100)} · Total: ${money(amount * (1 + rate / 100))}`;
  }

  if (action === 'discount') {
    const price = number('discountPrice');
    const rate = number('discountRate');

    if (price < 0 || !validPercentage(rate)) {
      notify('Introduce un precio válido y un descuento entre 0 y 100%.');
      return;
    }

    document.getElementById('discountResult').textContent =
      `Ahorras ${money(price * rate / 100)} · Precio final: ${money(price * (1 - rate / 100))}`;
  }

  if (action === 'percentage') {
    const amount = number('partAmount');
    const total = number('wholeAmount');

    document.getElementById('percentageResult').textContent =
      total !== 0
        ? `${(amount / total * 100).toLocaleString('es-ES', { maximumFractionDigits: 2 })} %`
        : 'El total no puede ser cero.';
  }

  if (action === 'password') {
    const length = Math.min(64, Math.max(8, Math.floor(number('passLength') || 20)));
    const symbols = document.getElementById('passSymbols').checked;
    const chars =
      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789' +
      (symbols ? '!@#$%&*_-+=?' : '');

    if (!window.crypto?.getRandomValues) {
      notify('Este navegador no admite la generación segura de contraseñas.');
      return;
    }

    let password = '';
    const bytes = new Uint32Array(length);
    crypto.getRandomValues(bytes);

    for (const byte of bytes) password += chars[byte % chars.length];

    document.getElementById('passwordResult').textContent = password;
  }

  if (action === 'copyPassword') {
    const password = document.getElementById('passwordResult').textContent;

    if (!password || password === 'Tu contraseña aparecerá aquí.') {
      notify('Primero genera una contraseña.');
      return;
    }

    try {
      await navigator.clipboard.writeText(password);
      notify('Contraseña copiada.');
    } catch {
      notify('No se pudo copiar automáticamente. Selecciona y copia el texto.');
    }
  }

  if (action === 'textFile') {
    const text = document.getElementById('textContent').value;
    const name = safeFilename(document.getElementById('textFilename').value, 'documento');

    if (!text.trim()) {
      notify('Escribe algún contenido antes de descargar.');
      return;
    }

    downloadBlob(
      new Blob([text], { type: 'text/plain;charset=utf-8' }),
      `${name}.txt`
    );
  }

  if (action === 'imagesPdf') {
    printImages([...document.getElementById('pdfImages').files]);
  }

  if (action === 'resizeImage') resizeImageNow();

  if (action === 'budget') {
    const income = number('budgetIncome');
    const expenses = number('budgetExpenses');

    if (income < 0 || expenses < 0) {
      notify('Los ingresos y gastos no pueden ser negativos.');
      return;
    }

    const balance = income - expenses;

    document.getElementById('budgetResult').textContent =
      `Saldo: ${money(balance)} · ${balance >= 0 ? 'Presupuesto positivo' : 'Gastos superiores a ingresos'}`;
  }

  if (action === 'clearTasks') {
    const tasks = loadList('irraTasks').filter(task => !task.done);

    try {
      localStorage.setItem('irraTasks', JSON.stringify(tasks));
    } catch {}

    renderTasks();
    notify('Tareas completadas eliminadas.');
  }

  if (action === 'quote') printQuote();

  if (action === 'qr') await createQr();

  if (action === 'downloadQr') downloadQr();

  if (action === 'theme') toggleTheme();

  if (action === 'clearLocal') {
    if (!confirm('¿Seguro que quieres borrar las tareas, favoritos y herramientas recientes?')) {
      return;
    }

    ['irraTasks', 'irraRecent', 'irraFavorites'].forEach(key => {
      localStorage.removeItem(key);
    });

    recentTools = [];
    favorites = [];
    notify('Datos locales borrados.');
    renderSimple('ajustes');
  }
});

content.addEventListener('submit', event => {
  if (event.target.id !== 'taskForm') return;

  event.preventDefault();

  const input = document.getElementById('taskInput');
  const text = input.value.trim();

  if (!text) return;

  const tasks = loadList('irraTasks');
  tasks.push({ text, done: false });

  try {
    localStorage.setItem('irraTasks', JSON.stringify(tasks));
  } catch {
    notify('No se pudo guardar la tarea.');
    return;
  }

  renderTasks();
  notify('Tarea añadida.');
});

content.addEventListener('change', event => {
  if (event.target.matches('#infoImage')) {
    showImageInfo(event);
    return;
  }

  if (!event.target.matches('[data-task]')) return;

  const tasks = loadList('irraTasks');
  const index = Number(event.target.dataset.task);

  if (!tasks[index]) return;

  tasks[index].done = event.target.checked;

  try {
    localStorage.setItem('irraTasks', JSON.stringify(tasks));
  } catch {
    notify('No se pudo guardar el cambio.');
  }

  renderTasks();
});

search.addEventListener('input', () => {
  if (currentView === 'inicio') {
    renderHome(search.value);
    return;
  }

  const query = search.value.trim().toLocaleLowerCase('es');

  if (!query) {
    if (categories.some(category => category.id === currentView)) {
      renderCategory(currentView);
    } else if (currentView === 'favoritos' || currentView === 'recientes') {
      renderSaved(currentView);
    } else if (currentView === 'ajustes' || currentView === 'acerca') {
      renderSimple(currentView);
    }
    return;
  }

  const results = allTools.filter(tool =>
    `${tool.name} ${tool.desc} ${tool.category}`
      .toLocaleLowerCase('es')
      .includes(query)
  );

  content.innerHTML = `
    <section class="tool-page">
      <button class="back-link" data-view="inicio">← Volver al inicio</button>
      <h1>Resultados de búsqueda</h1>
      <p class="intro">${results.length} herramientas encontradas</p>
      <div class="quick-list">
        ${results.map(tool => `
          <button class="quick-tool" data-tool="${tool.id}">
            <strong>${tool.name}</strong>
            <small>${tool.desc}</small>
          </button>
        `).join('') || '<div class="empty-state">No hay coincidencias.</div>'}
      </div>
    </section>
  `;
});

document.getElementById('themeToggle').addEventListener('click', toggleTheme);

restoreTheme();
renderHome();
