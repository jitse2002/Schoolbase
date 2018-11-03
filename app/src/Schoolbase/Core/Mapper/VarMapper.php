<?php
/**
 * A project created by Jitsedev.be
 *
 * Author: Jitse Taels <jitse@jitsedev.be>
 * Date: 2/11/18 13:12
 */

namespace Schoolbase\Core\Mapper;


class VarMapper
{

    private $vars;

    public function __construct(){}

    public function setVarMap($vars = []){

        $this->vars = $vars;

    }

    public function addVarToMap($key,$value){

        $this->vars[$key] = $value;

    }

    public function getVar($key){

        if(isset($this->vars[$key])){

            return $this->vars[$key];

        }

        return null;

    }

    public function removeVar($key){

        if(isset($this->vars[$key])) {

            unset($this->vars[$key]);

        }

    }

    public function varExists($key){

        return isset($this->vars[$key]) ? true : false;

    }

    public function getVarMap(){

        return $this->vars;

    }

}