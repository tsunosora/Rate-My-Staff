<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeaveLink extends Model
{
    protected $fillable = ['token', 'expires_at'];
}
