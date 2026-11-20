/* Datos públicos del proyecto de Firebase de la app (identifican el proyecto; no son claves secretas).
   TB_VAPID es la clave pública de «Certificados push web» de Cloud Messaging. */
self.TB_FIREBASE = {
  apiKey: 'AIzaSyDpAg7L0YVZCmH2BEJTHQHEnzOwD8ZXGd4',
  authDomain: 'elninopiura.firebaseapp.com',
  projectId: 'elninopiura',
  storageBucket: 'elninopiura.firebasestorage.app',
  messagingSenderId: '585779941398',
  appId: '1:585779941398:web:db8c4b4f8b443fca14e537'
};
self.TB_VAPID = 'BDd5jWzKYcuCmIJGhcRiLlI8sTezWjBC2VMS281-rhsiXS9YX4PZU3wpUOVq_gT70wk5UrecuuDk8m_-_QeMhiI';

/* Mapa de Google para el mapa de calor (Map Tiles API). Vacío: se usa el mapa de OpenStreetMap y CARTO.
   Para activarlo, crea una clave en Google Cloud con «Map Tiles API» habilitada, restríngela al sitio
   https://rezavalas.github.io/* y pégala entre las comillas. */
self.TB_GOOGLE_MAPS = '';
