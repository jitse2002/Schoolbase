<?php
/**
 * A project created by Jitsedev.be
 *
 * Author: Jitse Taels <jitse@jitsedev.be>
 * Date: 23/10/18 18:09
 */

namespace Schoolbase\Core;


use Schoolbase\Core\DB\DB;
use Schoolbase\Core\Util\Resource;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Session\Session;

class Kernel
{

    private $request;
    private $session;
    private $user;
    private $database;
    private $running = false;
    private $debug = false;

    public function __construct()
    {

        $this->request = Request::createFromGlobals();
        $this->session = new Session();
        $this->user = new User\User();
        $this->database = DB::getInstance();

    }

    public function setDebug($state) {

        $this->debug = (bool) $state;

    }

    public function run(){

        $this->running = true;

        //Als de gebruiker een gast is(niet ingelogd) dan laden we apparte routes
        if($this->user->isGuest()){

            //Voor de authenticate zijn er geen regex routes nodig!
            switch ($this->request->getRequestUri()){

                case '/login':
                        Resource::callController('Authentication','index_action');
                    break;

                case '/auth/login/validate':
                    Resource::callController('AuthRest', 'login_action');
                    break;

                default:
                    header('location: /login');

            }

        }else {

            include_once BASEPATH . '/../app/src/Schoolbase/Core/routes.php';

        }

    }

}