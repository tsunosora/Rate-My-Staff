<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Employee extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'employee_code',
        'full_name',
        'nickname',
        'department_id',
        'position_id',
        'photo_path',
        'join_date',
        'salary',
        'email',
        'phone',
        'is_active',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'is_active' => 'boolean',
        'join_date' => 'date:Y-m-d',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array<int, string>
     */
    protected $appends = [
        'average_score',
        'previous_score',
        'photo_url',
    ];

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function position()
    {
        return $this->belongsTo(Position::class);
    }

    /**
     * Get assessments for this employee.
     */
    public function assessments()
    {
        return $this->hasMany(Assessment::class);
    }

    /**
     * Get the latest assessment.
     */
    public function latestAssessment()
    {
        return $this->hasOne(Assessment::class)->latestOfMany('assessment_date');
    }

    /**
     * Get average score across all assessments.
     */
    public function getAverageScoreAttribute(): ?float
    {
        return $this->assessments()
            ->where('status', 'completed')
            ->avg('total_score');
    }

    /**
     * Get previous assessment score for trend tracking.
     */
    public function getPreviousScoreAttribute(): ?float
    {
        $assessments = $this->assessments()
            ->where('status', 'completed')
            ->orderBy('assessment_date', 'desc')
            ->take(2)
            ->get();

        if ($assessments->count() > 1) {
            return $assessments[1]->total_score;
        }

        return null;
    }

    /**
     * Get photo URL attribute.
     */
    public function getPhotoUrlAttribute(): string
    {
        if ($this->photo_path) {
            return asset('storage/' . $this->photo_path);
        }
        return asset('images/default-avatar.png');
    }

    /**
     * Scope for active employees.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope for search.
     */
    public function scopeSearch($query, $search)
    {
        return $query->where(function ($q) use ($search) {
            $q->where('full_name', 'like', "%{$search}%")
                ->orWhere('employee_code', 'like', "%{$search}%")
                ->orWhereHas('department', function ($dq) use ($search) {
                    $dq->where('name', 'like', "%{$search}%");
                })
                ->orWhereHas('position', function ($pq) use ($search) {
                    $pq->where('name', 'like', "%{$search}%");
                });
        });
    }
}
