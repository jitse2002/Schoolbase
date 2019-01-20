<?php
/**
 * A project created by Jitsedev.be
 *
 * Author: Jitse Taels <jitse@jitsedev.be>
 * Date: 20/01/19 12:42
 */

class AgendaHomeController extends \Schoolbase\Core\Controller\Controller
{

    public function index(){

        \Schoolbase\Core\Util\Resource::callModuleView('Agenda','index');
    }

}