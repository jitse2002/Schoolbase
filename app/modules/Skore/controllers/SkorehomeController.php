<?php
/**
 * A project created by Jitsedev.be
 *
 * Author: Jitse Taels <jitse@jitsedev.be>
 * Date: 3/11/18 13:41
 */

class SkorehomeController extends \Schoolbase\Core\Controller\Controller
{
    
    public function index(){
        
        $user = new \Schoolbase\Core\User\User();

        if(!$user->permissions()->has('skore','home.view')){

            die;

        }

        \Schoolbase\Core\Util\Resource::callModuleView('Skore','index');

    }

}