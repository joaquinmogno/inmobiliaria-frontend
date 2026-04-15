import React from "react";
import { formatDate } from "../utils/date";
import { UserIcon, UsersIcon, CalendarIcon } from "@heroicons/react/24/outline";

export interface ContractCardProps {
    address: string;
    owner: string;
    tenant: string;
    date: string;
    badgeText: string;
    badgeColor: "red" | "orange";
    icon: React.ElementType;
    onClick?: () => void;
    action?: React.ReactNode;
}

export default function ContractCard({
    address,
    owner,
    tenant,
    date,
    badgeText,
    badgeColor,
    icon: Icon,
    onClick,
    action
}: ContractCardProps) {
    const borderClass = badgeColor === "red" ? "border-red-500" : "border-orange-500";
    const badgeBgClass = badgeColor === "red" ? "bg-red-50" : "bg-orange-50";
    const badgeTextClass = badgeColor === "red" ? "text-red-700" : "text-orange-700";

    return (
        <div className={`bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 border-l-4 ${borderClass}`}>
            <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                    <a
                        onClick={onClick}
                        className="font-semibold text-base text-indigo-600 hover:text-indigo-800 cursor-pointer transition-colors"
                    >
                        {address}
                    </a>

                    <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <UserIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="truncate"><span className="font-medium">Propietario:</span> {owner}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <UsersIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="truncate"><span className="font-medium">Inquilino:</span> {tenant}</span>
                        </div>
                    </div>
                </div>

                <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
                        <CalendarIcon className="w-4 h-4" />
                        <span>{formatDate(date)}</span>
                    </div>

                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold text-xs whitespace-nowrap ${badgeBgClass} ${badgeTextClass}`}>
                        <Icon className="w-4 h-4" />
                        <span>{badgeText}</span>
                    </div>

                    {action && (
                        <div className="mt-3">
                            {action}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
