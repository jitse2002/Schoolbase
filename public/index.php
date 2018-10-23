<?php
/**
 * A project created by Jitsedev.be
 *
 * Author: Jitse Taels <jitse@jitsedev.be>
 * Date: 22/10/18 18:29
 */
session_start();

define('INDEX', 'ok');
define('BASEPATH', $_SERVER["DOCUMENT_ROOT"]);

if(file_exists(BASEPATH . '/../vendor/autoload.php'))
    include_once BASEPATH . '/../vendor/autoload.php';
else
    die('Unable to load the composer!');

$kernel = new \Schoolbase\Core\Kernel();

$kernel->run();