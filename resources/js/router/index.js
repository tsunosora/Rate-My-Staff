import { createRouter, createWebHistory } from 'vue-router';

// Component definitions
import Login from '../Pages/Auth/Login.vue';
import Dashboard from '../Pages/Dashboard/Index.vue';
import CreateSingleAssessment from '../Pages/Assessment/CreateSingle.vue';
import EmployeeIndex from '../Pages/Employee/Index.vue';

const routes = [
    {
        path: '/login',
        name: 'login',
        component: Login,
        meta: { title: 'Login - Employee Assessment Admin' }
    },
    {
        path: '/dashboard',
        name: 'dashboard',
        component: Dashboard,
        meta: { title: 'Dashboard Overview' }
    },
    {
        path: '/employees',
        name: 'employees',
        component: EmployeeIndex,
        meta: { title: 'Employee Directory' }
    },
    {
        path: '/reports',
        name: 'reports',
        component: () => import('../Pages/Report/Index.vue'),
        meta: { title: 'Reports & Analytics' }
    },
    {
        path: '/settings',
        name: 'settings',
        component: () => import('../Pages/Setting/Index.vue'),
        meta: { title: 'Settings & User Management' }
    },
    {
        path: '/settings/work-schedules',
        name: 'settings.schedules',
        component: () => import('../Pages/Setting/WorkSchedules.vue'),
        meta: { title: 'Work Schedules Configuration' }
    },

    {
        path: '/assessments/create/single',
        name: 'assessments.create.single',
        component: CreateSingleAssessment,
        meta: { title: 'New Assessment' }
    },
    {
        path: '/assessments/edit/:id',
        name: 'assessments.edit.single',
        component: () => import('../Pages/Assessment/EditSingle.vue'),
        meta: { title: 'Edit Assessment' }
    },
    {
        path: '/assessments/create/bulk',
        name: 'assessments.create.bulk',
        component: () => import('../Pages/Assessment/CreateBulk.vue'),
        meta: { title: 'Bulk Assessment' }
    },
    {
        path: '/attendance',
        name: 'attendance',
        component: () => import('../Pages/Attendance/Index.vue'),
        meta: { title: 'Attendance Dashboard' }
    },
    {
        path: '/attendance/report',
        name: 'attendance.report',
        component: () => import('../Pages/Attendance/Report.vue'),
        meta: { title: 'Detailed Attendance Report' }
    },
    {
        path: '/assessments/templates',
        name: 'assessments.templates',
        component: () => import('../Pages/Assessment/Templates.vue'),
        meta: { title: 'Assessment Templates' }
    },
    {
        path: '/rate/:token',
        name: 'public.rate',
        component: () => import('../Pages/Public/RateEmployee.vue'),
        meta: { title: 'Rate Employee' }
    },
    {
        path: '/public/absence-form/:token',
        name: 'public.absence.form',
        component: () => import('../Pages/Public/AbsenceForm.vue'),
        meta: { title: 'Formulir Ketidakhadiran' }
    },
    // Catch-all route to redirect unknown paths
    {
        path: '/:pathMatch(.*)*',
        redirect: '/dashboard'
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

import axios from 'axios';

router.beforeEach(async (to, from, next) => {
    document.title = to.meta.title || 'Employee Assessment Admin';

    // Check authentication state
    try {
        const authResponse = await axios.get('/api/test-auth');
        const isAuthenticated = authResponse.data.auth_check;

        if (to.name === 'login' && isAuthenticated) {
            return next({ name: 'dashboard' });
        }

        // Allow access to public routes even if unauthenticated
        if (to.name === 'public.rate' || to.name === 'public.absence.form') {
            return next();
        }

        if (to.name !== 'login' && !isAuthenticated) {
            return next({ name: 'login' });
        }

        next();
    } catch (error) {
        // If API fails (e.g. 401 Unauthorized), redirect to login if not already there
        if (to.name !== 'login') {
            return next({ name: 'login' });
        }
        next();
    }
});

export default router;
