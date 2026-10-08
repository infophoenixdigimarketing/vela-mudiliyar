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
  // A DIFFERENT long random string. This is the password for the unattended
  // daily birthday-SMS job (?route=announcements/send-birthdays&secret=...) —
  // anyone who has it can trigger a send, so keep it private and don't reuse
  // the 'secret' above. While this is still the placeholder, that route
  // always rejects every request, so nothing can fire by accident.
  'cron_secret' => 'CHANGE-THIS-to-a-different-long-random-string-for-cron',
  // Used to decide which calendar day "today" is for birthday matching.
  'timezone' => 'Asia/Kolkata',
];
