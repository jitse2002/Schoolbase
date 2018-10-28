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

            echo 'udjzdjsdjsd';

        }

    }

}