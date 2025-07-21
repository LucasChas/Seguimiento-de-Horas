# Track Time Solutions

## Descripción
Track Time Solutions es una aplicación web para el registro diario de horas de trabajo.  
Permite visualizar un calendario, cargar horas en cada día, gestionar ausencias y obtener estadísticas mensuales.

## Tecnologías
- **React**  
- **Supabase** (base de datos y autenticación)  
- **JavaScript (ES6+)**  
- **SweetAlert2** (modales y notificaciones)

## Estructura de carpetas

Seguimiento-de-Horas/
├─ gestion-horas/
│ ├─ src/
│ │ ├─ assets/
│ │ ├─ components/
│ │ │ ├─ Auth/
│ │ │ ├─ Calendar/
│ │ │ ├─ DayModal/
│ │ │ ├─ HolidayModal/
│ │ │ ├─ MonthSummary/
│ │ │ ├─ Profile/
│ │ │ └─ Sidebar/
│ │ ├─ supabase/
│ │ ├─ utils/
│ │ ├─ App.jsx
│ │ ├─ main.jsx
│ │ └─ index.css
│ ├─ .env
│ └─ package.json
└─ README.md

## Instalación

```bash
git clone https://github.com/LucasChas/Seguimiento-de-Horas.git
cd Seguimiento-de-Horas/gestion-horas
npm install
npm run dev

Uso
Abre en tu navegador la URL que indique la terminal (por ejemplo, http://localhost:5173).

Ve a la sección Calendar para ver el mes en curso.

Haz clic en un día para cargar horas; SweetAlert2 mostrará un modal donde ingresar tus datos.

Consulta MonthSummary para ver estadísticas y trazabilidad mensual.

Contribuciones
Actualmente no se aceptan PR externas.

Próximamente publicaremos pautas de colaboración.

Licencia
Track Time Solutions no cuenta aún con licencia. Se agregará en futuras versiones.
