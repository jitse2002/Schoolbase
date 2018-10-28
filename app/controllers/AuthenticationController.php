<?php
/**
 * A project created by Jitsedev.be
 *
 * Author: Jitse Taels <jitse@jitsedev.be>
 * Date: 25/10/18 18:32
 */

class AuthenticationController
{

    public function index_action(){

        \Schoolbase\Core\Util\Resource::callView("login");

    }

}