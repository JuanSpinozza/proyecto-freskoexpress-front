import { Component } from '@angular/core';
import { ConnectivityService } from '../../core/services/connectivity.service';

@Component({
  selector: 'app-connectivity-indicator',
  standalone: true,
  template: `
    <div class="connectivity-indicator" [class.online]="connectivityService.isOnline()" [class.offline]="!connectivityService.isOnline()">
      <span class="status-dot"></span>
      <span class="status-text">
        {{ connectivityService.isOnline() ? 'Online' : 'Offline' }}
      </span>
    </div>
  `,
  styles: [`
    .connectivity-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 1000;
      transition: all 0.3s ease;
    }
    
    .connectivity-indicator.online {
      background-color: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }
    
    .connectivity-indicator.offline {
      background-color: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }
    
    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
    }
    
    .connectivity-indicator.online .status-dot {
      background-color: #28a745;
    }
    
    .connectivity-indicator.offline .status-dot {
      background-color: #dc3545;
    }
    
    @media (max-width: 576px) {
      .connectivity-indicator {
        top: 8px;
        right: 8px;
        padding: 6px 12px;
        font-size: 12px;
      }
    }
  `]
})
export class ConnectivityIndicatorComponent {
  constructor(public connectivityService: ConnectivityService) {}
}