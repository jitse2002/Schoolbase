<?php
/**
 * A project created by Jitsedev.be
 *
 * Author: Jitse Taels <jitse@jitsedev.be>
 * Date: 28/10/18 11:17
 */

/**
 * Created by PhpStorm.
 * User: Gebruiker
 * Date: 28/10/2018
 * Time: 11:17
 */

namespace Schoolbase\Core\Controller;


use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

abstract class BaseController
{

    protected $request;
    protected $response;

    protected function __construct()
    {

        $this->request = Request::createFromGlobals();
        $this->response = new Response();

    }

    public abstract function output($data);

}