const express = require('express');
const session = require('express-session');
const passport = require('passport');
const { Strategy } = require('passport-discord');
const path = require('path');
const config = require('../../config.json');
const { sessionStorage } = require('../utils/jsonStorage');

// Configuración de Passport Discord
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

const BASE_URL = 'https://fbad2891-5a9d-421d-91d4-7e74da25f5d7-00-3hllxemm25m5u.kirk.replit.dev';

const strategy = new Strategy({
    clientID: config.clientId,
    clientSecret: config.clientSecret,
    callbackURL: `${BASE_URL}/auth/discord/callback`,
    scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    console.log('Autenticación exitosa para:', profile.username);
    profile.accessToken = accessToken;
    return done(null, profile);
});

passport.use(strategy);

// Configuración de Express
const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Store personalizado para sesiones en archivo JSON
const JsonStore = {
    get: async function(sid, callback) {
        try {
            const session = await sessionStorage.getSession(sid);
            callback(null, session);
        } catch (err) {
            callback(err);
        }
    },
    set: async function(sid, session, callback) {
        try {
            await sessionStorage.setSession(sid, session);
            callback();
        } catch (err) {
            callback(err);
        }
    },
    destroy: async function(sid, callback) {
        try {
            await sessionStorage.deleteSession(sid);
            callback();
        } catch (err) {
            callback(err);
        }
    }
};

// Configuración de sesiones
app.use(session({
    secret: config.clientSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 60000 * 60 * 24 // 24 horas
    },
    store: JsonStore
}));

app.use(passport.initialize());
app.use(passport.session());

// Middleware de autenticación
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/login');
}

// Rutas
app.get('/', (req, res) => {
    console.log('Acceso a página principal, usuario:', req.user?.username || 'no autenticado');
    res.render('home', {
        user: req.user,
        botGuilds: req.user ? req.user.guilds : []
    });
});

app.get('/login', (req, res) => {
    req.session.returnTo = BASE_URL;
    passport.authenticate('discord')(req, res);
});

app.get('/auth/discord/callback', 
    (req, res, next) => {
        console.log('Recibida solicitud de callback:', req.url);
        next();
    },
    passport.authenticate('discord', { 
        failureRedirect: '/',
        failureFlash: true
    }),
    (req, res) => {
        console.log('Autenticación completada para:', req.user.username);
        const returnTo = req.session.returnTo || '/';
        delete req.session.returnTo;
        res.redirect(returnTo);
    }
);

app.get('/dashboard', isAuthenticated, (req, res) => {
    console.log('Acceso al dashboard por:', req.user.username);
    res.render('dashboard', {
        user: req.user,
        botGuilds: req.user.guilds
    });
});

app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) return next(err);
        res.redirect('/');
    });
});

module.exports = app;