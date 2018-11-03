<?php
namespace Schoolbase\Core\Module;

/**
 * A project created by Jitsedev.be
 *
 * Author: Jitse Taels <jitse@jitsedev.be>
 * Date: 2/11/18 11:52
 */

class Module
{

    public static function logSuspiciousModuleEntry($module){

        $db = \Schoolbase\Core\DB\DB::getInstance();

        $db->insert('_module_suspicious_entries',['module' => $module,'url' => $_SERVER['REQUEST_URI'], 'userID' => $_SESSION['user']['id'], 'ip' => $_SERVER['REMOTE_ADDR'], 'userAgent' => $_SERVER['HTTP_USER_AGENT'], 'time' => time()]);

    }

}