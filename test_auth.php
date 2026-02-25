<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

// Get CSRF Token First
$req0 = Illuminate\Http\Request::create('/sanctum/csrf-cookie', 'GET');
$res0 = $kernel->handle($req0);
$csrfToken = null;
foreach ($res0->headers->getCookies() as $c) {
    if ($c->getName() === 'XSRF-TOKEN') {
        $csrfToken = $c->getValue();
    }
}
$sessionCookie = $res0->headers->getCookies()[0];

// Login
$req1 = Illuminate\Http\Request::create('/login', 'POST', ['email' => 'admin@voliko.com', 'password' => 'password']);
$req1->headers->set('X-XSRF-TOKEN', $csrfToken);
$req1->cookies->set($sessionCookie->getName(), $sessionCookie->getValue());
$res1 = $kernel->handle($req1);
echo "LOGIN STATUS: " . $res1->getStatusCode() . "\n";
echo "LOGIN CONTENT: " . substr($res1->getContent(), 0, 100) . "\n";
$cookies = $res1->headers->getCookies();
$cookie = null;
foreach ($cookies as $c) {
    if ($c->getName() === config('session.cookie')) {
        $cookie = $c;
        break;
    }
}

if (!$cookie) {
    echo "NO SESSION COOKIE FOUND!\n";
    exit(1);
}

// Test Auth
$req2 = Illuminate\Http\Request::create('/api/test-auth', 'GET');
$req2->cookies->set($cookie->getName(), $cookie->getValue());
$res2 = $kernel->handle($req2);
echo "RESPONSE FROM /api/test-auth:\n";
echo $res2->getContent() . "\n";
echo "\nSession Data:\n";
print_r(session()->all());
var_dump(auth()->check());
