<?php
/**
 * A project created by Jitsedev.be
 *
 * Author: Jitse Taels <jitse@jitsedev.be>
 * Date: 28/10/18 11:17
 */

namespace Schoolbase\Core\Controller;


class RestController extends BaseController
{

    public function __construct()
    {

        parent::__construct();

    }

    public function output($data = [])
    {

        header('Content-Type: application/json');

        $this->response->setContent(json_encode((array)$data));

        die($this->response->getContent());

    }
}