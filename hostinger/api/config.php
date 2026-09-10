<?php
// ============================================================
// MVA Membership System — Hostinger configuration
// Fill these in from Hostinger hPanel → Databases → MySQL Databases
// ============================================================
return [
  'db_host' => 'localhost',
  'db_name' => 'YOUR_DATABASE_NAME',   // e.g. u123456789_mva
  'db_user' => 'YOUR_DATABASE_USER',   // e.g. u123456789_mvauser
  'db_pass' => 'YOUR_DATABASE_PASSWORD',
  // Change this to any long random string (keeps login tokens secure)
  'secret'  => 'CHANGE-THIS-to-a-long-random-string-mva-2026',
];
