<?php
require 'vendor/autoload.php';
\ = require_once 'bootstrap/app.php';
\ = \->make(Illuminate\Contracts\Http\Kernel::class);

// Login request (simulate web POST)
\ = Illuminate\Http\Request::create('/login', 'POST', [
    'email' => 'admin@voliko.com',
    'password' => 'password'
]);
\ = \->handle(\);
echo 'Login Response: ' . \->getStatusCode() . \"\n\";

// Get the session cookie
\ = \->headers->getCookies();
\ = null;
foreach (\ as \) {
    if (\->getName() === config('session.cookie')) {
        \ = \->getValue();
    }
}
echo 'Session Cookie: ' . (\ ? 'Found' : 'Missing') . \"\n\";

// API request (simulate web GET /api/user with session)
\ = Illuminate\Http\Request::create('/api/user', 'GET');
\->cookies->set(config('session.cookie'), \);
\ = \->handle(\);
echo 'User API Response: ' . \->getStatusCode() . \"\n\";
echo 'User Output: ' . \->getContent() . \"\n\";
