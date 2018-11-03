<?php
/**
 * A project created by Jitsedev.be
 *
 * Author: Jitse Taels <jitse@jitsedev.be>
 * Date: 28/10/18 11:25
 */

class AuthRestController extends \Schoolbase\Core\Controller\RestController
{

    public function login_action() {

        if(isset($_POST['username']) && isset($_POST['password']) && isset($_POST['token'])){

            $user = new \Schoolbase\Core\User\User();

            $username = $_POST['username'];
            $password = $_POST['password'];

            $login = $user->login();

            $login->fill($username,$password);

            if(!$login->run())
                $this->output(['error' => ['msg' => 'Onjuiste gegevens!']]);
            else
                $this->output(['success' => ['msg' => 'Succesvol ingelogd!']]);

        }

    }

}