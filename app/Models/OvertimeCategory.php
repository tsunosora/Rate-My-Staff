<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OvertimeCategory extends Model
{
    protected $fillable = [
        'name',
        'type',
        'rate',
        'company_context',
    ];
}
